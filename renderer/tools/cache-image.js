const crypto = require('crypto');
const path = require('path');

const fs = require('fs-extra');
const electron = require('electron');
const app = electron.app || electron.remote.app;

const log = require('../../lib/log.js')('cache-image');
const watcher = require('./cache-watcher.js');
const noOverlap = require('./promise-overlap.js')();

const dir = path.join(app.getPath('temp'), app.getName());
const hash = (str) => crypto.createHash('md5').update(str).digest('hex');

const file = async (filepath) => {
  // get timestamp for the file's last modification
  const { mtime } = await fs.stat(filepath);
  return path.resolve(dir, hash(`${mtime}--{filepath}`));
};

const silentTiming = async (title, func) => {
  return await log.timing(title, async () => {
    try {
      return await func();
    } catch (e) {
      log.error('ignoring image cache error:', e);
    }
  });
};

const read = noOverlap(async (filepath) => {
  return await silentTiming(`reading cached ${filepath}`, async () => {
    const location = await file(filepath);

    try {
      return await fs.readFile(location);
    } catch (e) {
      return;
    }
  });
});

const add = noOverlap(async (filepath, data) => {
  await silentTiming(`caching ${filepath}`, async () => {
    const location = await file(filepath);
    await fs.outputFile(location, data);
  });
});

const remove = noOverlap(async (filepath) => {
  await silentTiming(`removing ${filepath}`, async () => {
    const location = await file(filepath);
    await fs.unlink(location);
  });
});

const reset = noOverlap(async () => {
  await silentTiming('reset image cache', async () => {
    await fs.emptyDir(dir);
  });
});

watcher.on('change', filepath => remove(filepath));

module.exports = { read, add, remove, reset };
