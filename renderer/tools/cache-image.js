const crypto = require('crypto');
const path = require('path');

const fs = require('fs-extra');
const electron = require('electron');
const app = electron.app || electron.remote.app;
const getWindow = electron.getCurrentWindow || electron.remote.getCurrentWindow;

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

// we won't bother with any cache errors, if we can't read or
// write to the cache, we will just generate the resource
// from scratch more times
const silentTiming = async (title, func, logError = true) => {
  return await log.timing(title, async () => {
    try {
      return await func();
    } catch (e) {
      if (logError) {
        log.error('ignoring image cache error:', e);
      }

      return null;
    }
  });
};

const read = noOverlap(async (filepath, key) => {
  return await silentTiming(`reading cached ${key} ${filepath}`, async () => {
    const location = await file(filepath, key);
    return await fs.readFile(location);
  }, false);
});

const add = noOverlap(async (filepath, key, data) => {
  await silentTiming(`caching ${key} ${filepath}`, async () => {
    const location = await file(filepath, key);
    await fs.outputFile(location, data);
  });
});

const purge = async () => {
  const browserWindow = getWindow();
  const unlink = noOverlap((p) => fs.unlink(p));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const files = await noOverlap(() => fs.readdir(dir))();

  log.info(`found ${files.length} cached images`);

  for (let idx in files) {
    browserWindow.setProgressBar((+idx + 1) / files.length);
    const filepath = path.resolve(dir, files[idx]);
    // files will be purged if they have not been accessed
    // in the last 30 days
    const { atime } = await fs.stat(filepath);

    if (atime < thirtyDaysAgo) {
      await unlink(filepath);
    }
  }

  browserWindow.setProgressBar(-1);
};

purge().then(() => {
  log.info('cache has been cleaned');
}).catch(err => {
  log.error('cache failed to clean', err);
});

module.exports = { read, add };
