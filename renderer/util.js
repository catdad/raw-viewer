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

  const file = await fs.readFile(filepath);

  return file;
}

async function imageUint8Array(filepath) {
  log.time('preview');

  const file = await readFileBuffer(filepath);

  // read image from raw data
  // var tiff = dcraw(file, { exportAsTiff: true });

  const preview = dcraw(file, { extractThumbnail: true });

  log.timeEnd('preview');

  return preview;
}

async function imageUrl(filepath) {
  const data = bufferToUrl(await imageUint8Array(filepath));

  return data;
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
