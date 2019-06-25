const crypto = require('crypto');
const path = require('path');

const fs = require('fs-extra');
const electron = require('electron');
const app = electron.app || electron.remote.app;

const log = require('../../lib/log.js')('cache-image');
const noOverlap = require('./promise-overlap.js')();

const dir = path.join(app.getPath('temp'), app.getName());
log.info('caching images in', dir);

const hash = (str) => crypto.createHash('md5').update(str).digest('hex');
const file = async (filepath, key = '') => {
  // get timestamp for the file's last modification
  const { mtime } = await fs.stat(filepath);
  return path.resolve(dir, hash(`${mtime}-${key}-{filepath}`));
};

const silentTiming = async (title, func) => {
  return await log.timing(title, async () => {
    try {
      return await func();
    } catch (e) {
      log.error('ignoring image cache error:', e);
      return null;
    }
  });
};

const read = noOverlap(async (filepath, key) => {
  return await silentTiming(`reading cached ${key} ${filepath}`, async () => {
    const location = await file(filepath, key);

    try {
      return await fs.readFile(location);
    } catch (e) {
      return;
    }
  });
});

const add = noOverlap(async (filepath, key, data) => {
  await silentTiming(`caching ${key} ${filepath}`, async () => {
    const location = await file(filepath, key);
    await fs.outputFile(location, data);
  });
});

const remove = noOverlap(async (filepath, key) => {
  await silentTiming(`removing ${key}, ${filepath}`, async () => {
    const location = await file(filepath, key);
    await fs.unlink(location);
  });
});

const reset = noOverlap(async () => {
  await silentTiming('reset image cache', async () => {
    await fs.emptyDir(dir);
  });
});

module.exports = { read, add, remove, reset };
