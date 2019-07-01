const path = require('path');
const fs = require('fs-extra');
const { dialog } = require('electron').remote;
const exiftool = require('../tools/exiftool-child.js');
const collection = require('../tools/collection.js');
const analytics = require('../../lib/analytics.js');
const config = require('../../lib/config.js');

//  const name = 'directory';

module.exports = ({ events }) => {

  async function ondir(dir) {
    exiftool.resetCache();
    await config.setProp('client.lastDirectory', dir);
    const list = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));

    const files = await collection.map(list, async (file) => {
      const filepath = path.resolve(dir, file);
      const type = path.extname(file).toLowerCase().replace(/^\./, '').toLowerCase();
      const stat = await fs.stat(filepath);

      return {
        filepath, file, type,
        isDir: stat.isDirectory(),
        isFile: stat.isFile()
      };
    });

    return {
      dir, files
    };
  }

  function recordAnalytics({ files }) {
    files.forEach(file => {
      const ext = file.isDir ? 'directory' : file.type;
      analytics.event('filetype', ext);
    });
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
    ondir(dir).then(result => {
      recordAnalytics(result);
      return result;
    }).then((result) => {
      events.emit('directory:replace', result);
      events.emit('directory:discover', result);
    }).catch((err) => {
      events.emit('error', err);
    });
  });

  return {};
};
