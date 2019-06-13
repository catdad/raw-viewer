const exiftool = require('../tools/exiftool-child.js');

async function readMetaAndDataUrl({ filepath, type = 'full', meta = null }) {
  if (meta === null) {
    meta = await exiftool.readShortMeta(filepath);
  }

  // for unsupported files, always return short meta
  if (meta.disabled) {
    return {
      url: meta.url,
      orientation: meta.orientation,
      rotation: meta.rotation,
      disabled: true,
      meta: meta
    };
  }

  // for some reason, when reading the jpeg to a dataUrl,
  // the subsequent reading of meta happens slower... like 40ms -> 500ms
  // this seems to be slow on the client, as exiftool in the main thread
  // is still fast... so we're gonna keep this for fullsize images
  if (type === 'full' && exiftool.isPlainImage(filepath)) {
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
    url: url,
    orientation: meta.orientation,
    rotation: meta.rotation,
    meta: meta
  };
}

module.exports = readMetaAndDataUrl;
