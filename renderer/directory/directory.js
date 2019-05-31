const path = require('path');
const fs = require('fs-extra');
const { dialog } = require('electron').remote;
const exiftool = require('../tools/exiftool-child.js');
const config = require('../../lib/config.js');

//  const name = 'directory';

module.exports = ({ events }) => {

  async function ondir(dir) {
    exiftool.resetCache();
    await config.setProp('client.lastDirectory', dir);
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

  events.on('directory:open', () => {
    const result = dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (!result) {
      return;
    }

    events.emit('directory:load', { dir: result[0] });
  });

  events.on('directory:load', ({ dir }) => {
    ondir(dir).then((result) => {
      events.emit('directory:discover', result);
    }).catch((err) => {
      events.emit('error', err);
    });
  });

  return {};
};
