const { promisify } = require('util');
const { execFile } = require('child_process');

const fs = require('fs-extra');
const dcraw = require(`dcraw-vendored-${process.platform}`);

const log = require('../../lib/log.js')('dcraw-bin');
const timing = require('../../lib/timing.js')('dcraw-bin');
const image = require('../../lib/image.js');

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
    throw new Error(`dcraw error: ${e.errno || e.code}`);
  }
};

const getTiff = async (filepath, size) => {
  return await timing({
    label: `render tiff ${filepath}`,
    func: async () => await exec(['-w', '-W', '-T', '-c', filepath], size * 5)
  });
};

const getJpegPreview = async (filepath, size) => {
  return await timing({
    label: `extract jpeg preview ${filepath}`,
    func: async () => await exec(['-e', '-c', filepath], size)
  });
};

module.exports = async (filepath, { type = 'raw' } = {}) => {
  const { size } = await fs.stat(filepath);

  if (type === 'preview') {
    return await getJpegPreview(filepath, size);
  }

  const tiff = await getTiff(filepath, size);

  return await timing({
    label: `convert tiff to jpeg ${filepath}`,
    func: async () => await image.tiffToJpeg(tiff)
  });
};
