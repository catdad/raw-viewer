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

module.exports = {
  bufferToJpeg,
  pathToJpeg,
  resizeJpeg
};
