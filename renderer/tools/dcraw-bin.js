const { promisify } = require('util');
const { execFile } = require('child_process');

const fs = require('fs-extra');
const dcraw = require(`dcraw-vendored-${process.platform}`);
const sharp = require('sharp');
const log = require('../../lib/log.js')('dcraw-bin');

log.info(`using dcraw at ${dcraw}`);

const exec = async (args, size) => {
  try {
    const { stdout } = await promisify(execFile)(dcraw, args, {
      windowsHide: true,
      maxBuffer: size,
      encoding: 'buffer'
    });
    return stdout;
  } catch (e) {
    return new Error(`dcraw error: ${e.errno || e.code}`);
  }
};

const getTiff = async (filepath, size) => {
  return await log.timing(`render tiff ${filepath}`, async () => {
    return exec(['-w', '-W', '-T', '-c', filepath], size * 5);
  });
};

const getJpegPreview = async (filepath, size) => {
  return await log.timing(`extract jpeg preview ${filepath}`, async () => {
    return exec(['-e', '-c', filepath], size);
  });
};

module.exports = async (filepath, { type = 'raw' } = {}) => {
  const { size } = await fs.stat(filepath);

  if (type === 'preview') {
    return await getJpegPreview(filepath, size);
  }

  const tiff = await getTiff(filepath, size);

  return await log.timing(`convert tiff to jpeg ${filepath}`, async () => {
    return await sharp(tiff).jpeg().toBuffer();
  });
};
