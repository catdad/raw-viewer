const fs = require('fs-extra');
const tempy = require('tempy');

const files = {};

const create = async configObj => {
  const file = tempy.file({ extension: 'json' });
  files[file] = true;

  await clean(file);
  await fs.writeFile(file, JSON.stringify(configObj));

  return file;
};

const clean = async file => {
  await fs.remove(file);
  delete files[file];
};

const cleanAll = async () => {
  for (let file in files) {
    await clean(file);
  }
};

module.exports = { create, clean, cleanAll };
