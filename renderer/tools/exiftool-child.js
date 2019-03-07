const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
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

  log.time(`read short meta ${filepath}`);
  const value = await exiftool('read:shortmeta', { filepath });
  log.timeEnd(`read short meta ${filepath}`);

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

async function readJpegBufferFromMeta({ filepath, start, length }) {
  let buffer;

  if (start && length) {
    // we can get a fast jpeg image
    log.time(`read jpeg ${filepath}`);
    buffer = await readFilePart({ filepath, start, length });
    log.timeEnd(`read jpeg ${filepath}`);
  } else {
    log.time(`read dcraw ${filepath}`);
    // we should fall back to dcraw - e.g. Canon 30D
    buffer = Buffer.from(await dcraw.exec('imageUint8Array', [filepath]));
    log.timeEnd(`read dcraw ${filepath}`);
  }

  return buffer;
}

async function readJpegFromMeta({ filepath, start, length, url }) {
  if (url) {
    return url;
  }

  return bufferToUrl(await readJpegBufferFromMeta({ filepath, start, length }));
}

async function readThumbFromMeta(data) {
  if (data.url) {
    return data.url;
  }

  let buffer;

  if (data.thumbStart && data.thumbLength) {
    // sometimes, the raw file will store a full size preview
    // and a thumbnail, and in those cases, using the smaller
    // image will be faster... though the resize makes large
    // images pretty fast, so maybe it's not worth?
    log.time(`read thumb ${data.filepath}`);
    buffer = await readFilePart({
      filepath: data.filepath,
      start: data.thumbStart,
      length: data.thumbLength
    });
    log.timeEnd(`read thumb ${data.filepath}`);
  } else {
    buffer = await readJpegBufferFromMeta(data);
  }

  log.time(`resize thumb ${data.filepath}`);
  buffer = await sharp(buffer).resize(200).toBuffer();
  log.timeEnd(`resize thumb ${data.filepath}`);

  return bufferToUrl(buffer);
}

function readThumb(filepath) {
  return readShortMeta(filepath)
    .then((data) => {
      return readThumbFromMeta(data).then(url => {
        return Object.assign({}, data, { url });
      });
    });
}

function readJpeg(filepath) {
  return readShortMeta(filepath)
    .then((data) => {
      return readJpegFromMeta(data).then(url => {
        return Object.assign({}, data, { url });
      });
    });
}

function setRating(filepath, rating = 0) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      if (data.ok) {
        return resolve(data.value);
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:set:rating', { filepath, id, rating });
  });
}

module.exports = {
  readMeta,
  readShortMeta,
  readJpeg,
  readJpegFromMeta,
  readThumb,
  readThumbFromMeta,
  setRating
};
