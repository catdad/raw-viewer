const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const prettyBytes = require('pretty-bytes');
const ipc = require('electron').ipcRenderer;

const log = require('../../lib/log.js')('exiftool-child');
const dcraw = require('./dcraw.js')(2);
const bufferToUrl = require('./bufferToUrl.js');

const unknown = (function () {
  const svg = fs.readFileSync(path.resolve(__dirname, 'unknown.svg'), 'utf8');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}());

const ROTATION = {
  'Horizontal (normal)': 0,
  'Rotate 90 CW': 90,
  'Rotate 270 CW': 270
};

function gid() {
  return Math.random().toString(36).substr(2);
}

function isPlainImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpeg', '.jpg', '.png'].includes(ext);
}

function exiftool(name, data) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    ipc.once(`exiftool:callback:${id}`, (ev, result) => {
      if (result.ok) {
        return resolve(result.value);
      }

      return reject(new Error(result.err));
    });

    ipc.send(`exiftool:${name}`, Object.assign({}, data, { id }));
  });
}

async function readMeta(filepath) {
  return await exiftool('read:fullmeta', { filepath });
}

async function readShortMeta(filepath) {
  const placeholder = {
    disabled: true,
    url: unknown,
    rotation: 0,
    rating: 0,
    filepath
  };

  const stat = await fs.stat(filepath);

  if (stat.isDirectory()) {
    return placeholder;
  }

  const value = await log.timing(
    `read short meta ${filepath}`,
    async () => await exiftool('read:shortmeta', { filepath })
  );

  if (value.error) {
    return placeholder;
  }

  return Object.assign(value, {
    filepath,
    rotation: ROTATION[value.orientation] || 0
  });
}

async function readFilePart({ filepath, start, length }) {
  let buffer = Buffer.alloc(length);
  const fd = await fs.open(filepath, 'r');
  await fs.read(fd, buffer, 0, length, start);
  await fs.close(fd);

  return buffer;
}

async function readFile(filepath) {
  return await log.timing(`read file ${filepath}`, () => fs.readFile(filepath));
}

async function resizeLargeJpeg({ filepath, buffer, length }) {
  const before = buffer.length;

  buffer = await log.timing(
    `resize large jpeg for ${filepath}`,
    async () => {
      const { size: filebytes } = await fs.stat(filepath);

      if (filebytes / 2 < length) {
        // this jpeg was more than twice the size of the original
        // raw file... something is off, so resize it... it's too big
        return await sharp(buffer).toBuffer();
      }

      return buffer;
    }
  );

  const diff = before - buffer.length;
  const pretty = prettyBytes(diff * -1);
  const percent = (1 - (buffer.length / before)) * 100;

  log.info(`change in ${filepath} size: ${pretty}, ${percent.toFixed(1)}%`);

  return buffer;
}

async function readJpegBufferFromMeta({ filepath, start, length }) {
  let buffer;

  if (start && length) {
    // we can get a fast jpeg image
    buffer = await log.timing(
      `read jpeg ${filepath}`,
      async () => await readFilePart({ filepath, start, length })
    );
  } else {
    // we should fall back to dcraw - e.g. Canon 30D
    buffer = await log.timing(
      `read dcraw ${filepath}`,
      async () => Buffer.from(await dcraw.exec('imageUint8Array', [filepath]))
    );
  }

  return buffer;
}

async function readJpegFromMeta({ filepath, start, length, url }) {
  if (url) {
    return url;
  }

  let buffer = isPlainImage(filepath) ?
    await readFile(filepath) :
    await readJpegBufferFromMeta({ filepath, start, length });

  if (length && length > 9999999) {
    // this image is probably too big, something suspicious is happening
    // ... it's probably a CR3 file, but I've seen it happen for other
    // formats as well
    buffer = await resizeLargeJpeg({ filepath, buffer, length });
  }

  return bufferToUrl(buffer);
}

async function readThumbFromMeta(data) {
  if (data.url) {
    return data.url;
  }

  let buffer;

  if (isPlainImage(data.filepath)) {
    buffer = await readFile(data.filepath);
  } else if (data.thumbStart && data.thumbLength) {
    // sometimes, the raw file will store a full size preview
    // and a thumbnail, and in those cases, using the smaller
    // image will be faster... though the resize makes large
    // images pretty fast, so maybe it's not worth?
    buffer = await log.timing(
      `read thumb ${data.filepath}`,
      async () => await readFilePart({
        filepath: data.filepath,
        start: data.thumbStart,
        length: data.thumbLength
      })
    );
  } else {
    buffer = await readJpegBufferFromMeta(data);
  }

  buffer = await log.timing(
    `resize thumb ${data.filepath}`,
    async () => await sharp(buffer).resize(200).toBuffer()
  );

  return bufferToUrl(buffer);
}

async function setRating(filepath, rating = 0) {
  return await exiftool('set:rating', { filepath, rating });
}

async function copyExif(filepath, targetpath) {
  return await exiftool('copy:exif', { filepath, targetpath });
}

module.exports = {
  isPlainImage,
  readMeta,
  readShortMeta,
  readJpegFromMeta,
  readThumbFromMeta,
  setRating,
  copyExif
};
