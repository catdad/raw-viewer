/* eslint-disable no-console */
const fs = require('fs-extra');

const dcraw = require('dcraw');

async function readFileBuffer(filepath) {
  if (Buffer.isBuffer(filepath)) {
    return filepath;
  }

  console.time('read');
  const file = await fs.readFile(filepath);
  console.timeEnd('read');

  return file;
}

async function imageUrl(filepath) {
  const file = await readFileBuffer(filepath);

  // read image from raw data
  // var tiff = dcraw(file, { exportAsTiff: true });

  console.time('preview');
  const preview = dcraw(file, { extractThumbnail: true });
  console.timeEnd('preview');

  return 'data:image/jpeg;base64,' + Buffer.from(preview).toString('base64');
}

async function imageMeta(filepath) {
  const file = await readFileBuffer(filepath);

  console.time('meta');
  var meta = dcraw(file, { verbose: true, identify: true });
  console.timeEnd('meta');

  return meta.trim().split('\n').reduce((memo, str) => {
    const [ name, ...val ] = str.split(':');

    memo[name.trim()] = val.join(':').trim();

    return memo;
  }, {});
}

async function imageElem(filepath) {
  const file = await readFileBuffer(filepath);

  const meta = await imageMeta(file);

  console.log(meta);

  const img = document.createElement('img');
  img.src = await imageUrl(file);

  return img;
}

module.exports = {
  imageElem,
  imageUrl,
  imageMeta
};
