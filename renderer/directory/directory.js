const path = require('path');
const fs = require('fs-extra');
const exiftool = require('../tools/exiftool-child.js');

//  const name = 'directory';

module.exports = function ({ events }) {

  async function ondir(dir) {
    const list = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));

    const files = list.map((file) => {
      const type = path.extname(file).toLowerCase().replace(/^\./, '');

      return {
        filepath: path.resolve(dir, file),
        file: file,
        type: type
      };
    });

    return {
      dir, files
    };
  }

  events.on('directory:load', ({ dir }) => {
    exiftool.resetCache();

    ondir(dir).then((result) => {
      events.emit('directory:discover', result);
    }).catch((err) => {
      events.emit('error', err);
    });
  });

  return {};
};
