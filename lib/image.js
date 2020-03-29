/* global document, Blob, Image */

const fs = require('fs-extra');
const sharp = require('sharp');

const timing = require('./timing.js')('IMAGE');

const elem = name => document.createElement(name);

const USE_SHARP = true;

const loadUrl = (img, url) => {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = e => reject(e);
    img.src = url;
  });
};

const toBlob = (canvas, type = 'image/jpeg', quality = 1) => new Promise(resolve => {
  canvas.toBlob(blob => {
    resolve(blob);
  }, type, quality);
});

const bufferToCanvas = async buffer => {
  const blob = new Blob([buffer.buffer]);
  const img = new Image();
  const url = URL.createObjectURL(blob);
  await loadUrl(img, url);
  URL.revokeObjectURL(url);

  const canvas = elem('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  const out = await toBlob(canvas);

  return Buffer.from(await out.arrayBuffer());
};

const resizeJpeg = async (data, width) => {
  return await sharp(data).resize(width).toBuffer();
};

const bufferToJpeg = async data => {
  return await timing({
    label: 'buffer-to-jpeg',
    func: async () => {
      return USE_SHARP ?
        await sharp(data).jpeg().toBuffer() :
        await bufferToCanvas(data);
    }
  });
};

const pathToJpeg = async filepath => {
  return await bufferToJpeg(await fs.readFile(filepath));
};

const imageDataToJpeg = async (arrayBuffer, width, height)  => {
  return await sharp(Buffer.from(arrayBuffer), {
    raw: { width, height, channels: 4 }
  }).jpeg().toBuffer();
};

const tiffToJpeg = async data => {
  return await bufferToJpeg(data);
};

module.exports = {
  resizeJpeg,
  bufferToJpeg,
  pathToJpeg,
  imageDataToJpeg,
  tiffToJpeg
};
