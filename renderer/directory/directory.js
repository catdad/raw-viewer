const path = require('path');
const fs = require('fs-extra');

//  const name = 'directory';

module.exports = function ({ events }) {

  async function ondir(dir) {
    const files = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));
    const filepaths = files.map((file) => path.resolve(dir, file));
    const types = Object.keys(files.reduce((memo, file) => {
      memo[path.extname(file)] = true;
      return memo;
    }, {}));

    return {
      dir, filepaths, types
    };
  }

  events.on('directory:load', ({ dir }) => {
    ondir(dir).then((result) => {
      events.emit('directory:discover', result);
    }).catch((err) => {
      events.emit('error', err);
    });
  });

  return {};
};
