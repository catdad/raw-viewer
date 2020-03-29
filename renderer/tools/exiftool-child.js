const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const prettyBytes = require('pretty-bytes');
const { readPsd } = require('ag-psd');

const name = 'exiftool-child';
const log = require('../../lib/log.js')(name);
const timing = require('../../lib/timing.js')(name);
const dcrawBin = require('./dcraw-bin.js');
const { bufferToUrl, urlToBuffer } = require('./bufferToUrl.js');
const metacache = require('./cache-meta.js');
const imagecache = require('./cache-image.js');
const { unknown } = require('./svg.js');

const image = require('../../lib/image.js');
const exiftool = require('../../lib/exiftool.js');
const gprtools = require('../../lib/gprtools.js');
const libheif = require('./libheif.js')(1);

const ROTATION = {
  'Horizontal (normal)': 0,
  'Rotate 90 CW': 90,
  'Rotate 270 CW': 270
};

function extension(filepath) {
  return path.extname(filepath).replace(/^\./, '').toLowerCase();
}

function isPlainImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpeg', '.jpg', '.png'].includes(ext);
}

// this can be displayed nativly in Electron, but it is
// a bit difficult to test, so convert it for now
function isPlainConvertable(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return ['.webp'].includes(ext);
}

function isGpr(filepath) {
  return path.extname(filepath).toLowerCase() === '.gpr';
}

async function readFullMeta(filepath) {
  const name = 'fullmeta';
  const existing = metacache.read(filepath, name);

  if (existing) {
    return existing;
  }

  const result = await timing({
    category: 'read-full-meta-child',
    variable: extension(filepath),
    func: async () => await exiftool.readFullMeta(filepath)
  });
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
    value = await timing({
      label: `read short meta ${filepath}`,
      category: 'read-short-meta-child',
      variable: extension(filepath),
      func: async () => await exiftool.readShortMeta(filepath)
    });
  } catch (e) {
    return placeholder;
  }

  const result = Object.assign(value, {
    filepath,
    rotation: value.isHeic ? 0 : ROTATION[value.orientation] || 0
  });

  metacache.add(filepath, name, result);

  return result;
}

async function readFilePart({ filepath, start, length }) {
  return timing({
    label: `read file part ${filepath}`,
    func: async () => {
      let buffer = Buffer.alloc(length);
      const fd = await fs.open(filepath, 'r');
      await fs.read(fd, buffer, 0, length, start);
      await fs.close(fd);

      return buffer;
    }
  });
}

async function readFile(filepath) {
  return await timing({
    label: `read file ${filepath}`,
    func: () => fs.readFile(filepath)
  });
}

async function readFilePsd(filepath) {
  return await imagecache.cacheable(filepath, 'psd-render', async () => {
    return await timing({
      label: `read psd ${filepath}`,
      func: async () => {
        const file = await log.timing('psd read', () => fs.readFile(filepath));
        const psd = await log.timing('psd parse', () => readPsd(file, {
          skipLayerImageData: true
        }));
        const canvas = psd.canvas;
        const imgUrl = await log.timing('psd canvas', () => canvas.toDataURL('image/jpeg'));
        const buffer = await log.timing('psd buffer', () => urlToBuffer(imgUrl));

        return buffer;
      }
    });
  });
}

async function readGpr(filepath) {
  return await imagecache.cacheable(filepath, 'gpr-render', async () => {
    return await timing({
      label: `read gpr ${filepath}`,
      func: () => gprtools.jpg(filepath)
    });
  });
}

async function readFileHeic(filepath) {
  return await imagecache.cacheable(filepath, 'heif-render', async () => {
    return await timing({
      label: `read heif ${filepath}`,
      func: () => libheif.jpg(filepath)
    });
  });
}

async function resizeLargeJpeg({ filepath, buffer, length }) {
  const before = buffer.length;

  buffer = await timing({
    label: `resize large jpeg for ${filepath}`,
    func: async () => {
      const { size: filebytes } = await fs.stat(filepath);

      if (filebytes / 2 < length) {
        // this jpeg was more than twice the size of the original
        // raw file... something is off, so resize it... it's too big
        return await sharp(buffer).toBuffer();
      }

      return buffer;
    }
  });

  const diff = before - buffer.length;
  const pretty = prettyBytes(diff * -1);
  const percent = (1 - (buffer.length / before)) * 100;

  log.info(`change in ${filepath} size: ${pretty}, ${percent.toFixed(1)}%`);

  return buffer;
}

async function readJpegBufferFromMeta({ filepath, start, length }) {
  if (start && length) {
    // we can get a fast jpeg image
    return await timing({
      label: `read preview ${filepath}`,
      func: async () => await readFilePart({ filepath, start, length })
    });
  }

  return await timing({
    label: `dcraw extract preview ${filepath}`,
    func: async () => {
      return await dcrawBin(filepath, { type: 'preview' });
    }
  });
}

async function readJpegFromMeta({ filepath, start, length, url, isPsd, isHeic }) {
  if (url) {
    return url;
  }

  return await timing({
    label: `read jpeg from meta ${filepath}`,
    category: 'read-jpeg-from-meta',
    variable: extension(filepath),
    func: async () => {
      let buffer;

      if (isPsd) {
        buffer = await readFilePsd(filepath);
      } else if (isHeic) {
        buffer = await readFileHeic(filepath);
      } else if (isPlainImage(filepath)) {
        buffer = await readFile(filepath);
      } else if (isPlainConvertable(filepath)) {
        buffer = await image.pathToJpeg(filepath);
      } else if (isGpr(filepath)) {
        await readGpr(filepath);
      } else {
        buffer = await readJpegBufferFromMeta({ filepath, start, length });
      }

      if (length && length > 9999999) {
        // this image is probably too big, something suspicious is happening
        // ... it's probably a CR3 file, but I've seen it happen for other
        // formats as well
        buffer = await resizeLargeJpeg({ filepath, buffer, length });
      }

      return bufferToUrl(buffer);
    }
  });
}

async function readThumbFromMeta(data) {
  if (data.url) {
    return data.url;
  }

  let buffer;

  await timing({
    category: 'read-thumb-from-meta',
    variable: extension(data.filepath),
    func: async () => {
      if (data.isPsd) {
        buffer = await readFilePsd(data.filepath);
      } else if (data.isHeic) {
        buffer = await readFileHeic(data.filepath);
      } else if (isPlainImage(data.filepath)) {
        buffer = await readFile(data.filepath);
      } else if (isPlainConvertable(data.filepath)) {
        buffer = await image.pathToJpeg(data.filepath);
      } else if (isGpr(data.filepath)) {
        buffer = await readGpr(data.filepath);
      } else if (data.thumbStart && data.thumbLength) {
        // sometimes, the raw file will store a full size preview
        // and a thumbnail, and in those cases, using the smaller
        // image will be faster... though the resize makes large
        // images pretty fast, so maybe it's not worth?
        buffer = await timing({
          label: `read thumb ${data.filepath}`,
          func: async () => await readFilePart({
            filepath: data.filepath,
            start: data.thumbStart,
            length: data.thumbLength
          })
        });
      } else {
        buffer = await readJpegBufferFromMeta(data);
      }
    }
  });

  buffer = await timing({
    label: `resize thumb ${data.filepath}`,
    category: 'resize-thumbnail',
    variable: extension(data.filepath),
    func: async () => await sharp(buffer).resize(200).toBuffer()
  });

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
  return imagecache.cacheable(filepath, 'raw', async () => {
    return await timing({
      label: `render ${filepath} from RAW`,
      category: 'raw-render',
      variable: extension(filepath),
      func: async () => {
        const jpeg = await dcrawBin(filepath, { type: 'raw' });
        return bufferToUrl(jpeg);
      }
    });
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
