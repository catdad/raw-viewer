const fs = require('fs-extra');
const sharp = require('sharp');

const pathToJpeg = async filepath => {
  return await sharp(await fs.readFile(filepath)).jpeg().toBuffer();
};

module.exports = {
  pathToJpeg
};
