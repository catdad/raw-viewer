const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const prettyBytes = require('pretty-bytes');
const { readPsd } = require('ag-psd');

const log = require('../../lib/log.js')('exiftool-child');
const dcrawBin = require('./dcraw-bin.js');
const { bufferToUrl, urlToBuffer } = require('./bufferToUrl.js');
const metacache = require('./cache-meta.js');
const imagecache = require('./cache-image.js');
const { unknown } = require('./svg.js');

const exiftool = require('../../lib/exiftool.js');

const ROTATION = {
  'Horizontal (normal)': 0,
  'Rotate 90 CW': 90,
  'Rotate 270 CW': 270
};

function isPlainImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpeg', '.jpg', '.png'].includes(ext);
}

async function readFullMeta(filepath) {
  const name = 'fullmeta';
  const existing = metacache.read(filepath, name);

  if (existing) {
    return existing;
  }

  const result = await exiftool.readFullMeta(filepath);
  metacache.add(filepath, name, result);

  return result;
}

async function queryMeta(filepath, keys) {
  return await exiftool.queryMeta(filepath, keys);
}

async function readShortMeta(filepath) {
  const name = 'shortmeta';
  const existing = metacache.read(filepath, name);

  if (existing) {
    return existing;
  }

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

  let value;
  try {
    value = await log.timing(
      `read short meta ${filepath}`,
      async () => await exiftool.readShortMeta(filepath)
    );
  } catch (e) {
    return placeholder;
  }

  const result = Object.assign(value, {
    filepath,
    rotation: ROTATION[value.orientation] || 0
  });

  metacache.add(filepath, name, result);

  return result;
}

async function readFilePart({ filepath, start, length }) {
  return log.timing(`read file part ${filepath}`, async () => {
    let buffer = Buffer.alloc(length);
    const fd = await fs.open(filepath, 'r');
    await fs.read(fd, buffer, 0, length, start);
    await fs.close(fd);

    return buffer;
  });
}

async function readFile(filepath) {
  return await log.timing(`read file ${filepath}`, () => fs.readFile(filepath));
}

async function readFilePsd(filepath) {
  const cacheKey = 'psd-render';
  const buffer = await imagecache.read(filepath, cacheKey);

  if (buffer) {
    return buffer;
  }

  return await log.timing(
    `read psd ${filepath}`,
    async () => {
      const file = await log.timing('psd read', () => fs.readFile(filepath));
      const psd = await log.timing('psd parse', () => readPsd(file, {
        skipLayerImageData: true
      }));
      const canvas = psd.canvas;
      const imgUrl = await log.timing('psd canvas', () => canvas.toDataURL('image/jpeg'));
      const buffer = await log.timing('psd buffer', () => urlToBuffer(imgUrl));

      imagecache.add(filepath, cacheKey, buffer);

      return buffer;
    }
  );
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
  if (start && length) {
    // we can get a fast jpeg image
    return await log.timing(
      `read preview ${filepath}`,
      async () => await readFilePart({ filepath, start, length })
    );
  }

  return await log.timing(`dcraw extract preview ${filepath}`, async () => {
    return await dcrawBin(filepath, { type: 'preview' });
  });
}

async function readJpegFromMeta({ filepath, start, length, url, isPsd }) {
  if (url) {
    return url;
  }

  let buffer = isPsd ? await readFilePsd(filepath) :
    isPlainImage(filepath) ?
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

  if (data.isPsd) {
    buffer = await readFilePsd(data.filepath);
  } else if (isPlainImage(data.filepath)) {
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
  metacache.remove(filepath);
  return await exiftool.setRating(filepath, rating);
}

async function copyMeta(filepath, targetpath) {
  return await exiftool.copyMeta(filepath, targetpath);
}

async function rawRender(filepath) {
  const cached = await imagecache.read(filepath, 'raw');

  if (cached) {
    return bufferToUrl(cached);
  }

  return await log.timing(`render ${filepath} from RAW`, async () => {
    const jpeg = await dcrawBin(filepath, { type: 'raw' });
    await imagecache.add(filepath, 'raw', jpeg);

    return bufferToUrl(jpeg);
  });
}

module.exports = {
  readFullMeta,
  readShortMeta,
  queryMeta,
  copyMeta,
  setRating,
  readJpegFromMeta,
  readThumbFromMeta,
  isPlainImage,
  rawRender,
  resetCache: () => metacache.reset()
};
