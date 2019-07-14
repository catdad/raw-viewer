const fs = require('fs-extra');
const tempy = require('tempy');

const files = {};

const create = async configObj => {
  const file = tempy.file({ extension: 'json' });
  await clean(file);
  await fs.writeFile(file, JSON.stringify(Object.assign({}, configObj, {
    anonymousId: '00000000-0000-4000-8000-0000000000c1'
  })));

  files[file] = true;
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
