const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');

const dcraw = require('dcraw');
const log = require('../tools/log.js')('util');

function bufferToUrl(buff) {
  return `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
}

async function readFileBuffer(filepath) {
  if (Buffer.isBuffer(filepath)) {
    return filepath;
  }

  log.time('read');
  const file = await fs.readFile(filepath);
  log.timeEnd('read');

  return file;
}

async function imageUint8Array(filepath) {
  log.info('imageUint8Array');
  const file = await readFileBuffer(filepath);

  // read image from raw data
  // var tiff = dcraw(file, { exportAsTiff: true });

  log.time('preview');
  const preview = dcraw(file, { extractThumbnail: true });
  log.timeEnd('preview');

  return preview;
}

async function imageUrl(filepath) {
  const preview = await imageUint8Array(filepath);

  return bufferToUrl(preview);
}

// TODO dead code, use exiftools instead
async function imageMeta(filepath) {
  const file = await readFileBuffer(filepath);

  log.time('meta');
  var meta = dcraw(file, { verbose: true, identify: true });
  log.timeEnd('meta');

  return meta.trim().split('\n').reduce((memo, str) => {
    const [ name, ...val ] = str.split(':');

    memo[name.trim()] = val.join(':').trim();

    return memo;
  }, {
    Size: prettyBytes(file.length)
  });
}

module.exports = {
  imageUrl,
  imageUint8Array,
  imageMeta,
  bufferToUrl
};
