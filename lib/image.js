const fs = require('fs-extra');
const sharp = require('sharp');

const resizeJpeg = async (data, width) => {
  return await sharp(data).resize(width).toBuffer();
};

const bufferToJpeg = async data => {
  return await sharp(data).jpeg().toBuffer();
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
