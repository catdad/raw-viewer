const path = require('path');

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

  let url = type === 'full' ?
    await exiftool.readJpegFromMeta(meta) :
    await exiftool.readThumbFromMeta(meta);

  return {
    url:url,
    orientation: meta.orientation,
    rotation: meta.rotation,
    meta: meta
  };
}

module.exports = readMetaAndDataUrl;
