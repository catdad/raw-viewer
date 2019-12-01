const crypto = require('crypto');
const path = require('path');

const fs = require('fs-extra');
const electron = require('electron');
const app = electron.app || electron.remote.app;
const getWindow = electron.getCurrentWindow || electron.remote.getCurrentWindow;

const config = require('../../lib/config.js');
const log = require('../../lib/log.js')('cache-image');
const noOverlap = require('./promise-overlap.js')();

const dir = path.join(app.getPath('temp'), app.getName());
log.info('caching images in', dir);

const hash = (str) => crypto.createHash('md5').update(str).digest('hex');
const file = async (filepath, key = '') => {
  // get timestamp for the file's last modification
  const { mtime } = await fs.stat(filepath);
  return path.resolve(dir, hash(`${mtime}-${key}-${filepath}`));
};

// we won't bother with any cache errors, if we can't read or write to the cache,
// we will just generate the resource from scratch more times
const silent = (prom, shouldLog = true) => prom.catch(e => {
  if (shouldLog) {
    log.error('ignoring image cache error:', e);
  }

  return null;
});

const allowCache = (() => {
  let allowed;

  return async () => {
    if (allowed !== undefined) {
      return allowed;
    }

    allowed = !(await config.getProp('experiments.disableCache'));

    return allowed;
  };
})();

const read = noOverlap((location) => silent(fs.readFile(location), false));
const write = noOverlap((location, data) => silent(fs.outputFile(location, data)));
const unlink = noOverlap((location) => silent(fs.unlink(location)));

const cacheable = async (filepath, key, func) => {
  const allowed = await allowCache();
  let location, result;

  if (allowed) {
    location = await file(filepath, key);

    result = await log.timing(
      `reading cached ${key} ${filepath}`,
      () => read(location)
    );

    if (result) {
      return result;
    }
  }

  result = await func();

  if (!allowed) {
    return result;
  }

  await log.timing(
    `writing cached ${key} ${filepath}`,
    () => write(location, result),
    true
  );

  return result;
};

const purge = async () => {
  const browserWindow = getWindow();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const files = await noOverlap(() => fs.readdir(dir))();

  log.info(`found ${files.length} cached images`);

  for (let idx in files) {
    browserWindow.setProgressBar((+idx + 1) / files.length);
    const filepath = path.resolve(dir, files[idx]);
    // files will be purged if they have not been accessed in the last 30 days
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

module.exports = { cacheable };
