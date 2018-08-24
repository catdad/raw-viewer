const path = require('path');

const { bufferToUrl } = require('../util.js');
const exiftool = require('../exiftool-child.js');

async function readMetaAndDataUrl({ filepath, type = 'full', meta = null }) {
  const ext = path.extname(filepath).toLowerCase();

  if (meta === null) {
    meta = await exiftool.readShortMeta(filepath);
  }

  if (['.jpeg', '.jpg', '.png'].includes(ext)) {
    return {
      url: filepath,
      orientation: meta.orientation,
      rotation: meta.rotation,
      meta: meta
    };
  }

  let buffer = type === 'full' ?
    await exiftool.readJpegFromMeta(meta) :
    await exiftool.readThumbFromMeta(meta);

  return {
    url: bufferToUrl(buffer),
    orientation: meta.orientation,
    rotation: meta.rotation,
    meta: meta
  };
}

module.exports = readMetaAndDataUrl;
