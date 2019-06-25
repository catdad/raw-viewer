const { get, set } = require('lodash');
const watcher = require('fs-watch-file')({ persistent: false });
const log = require('../../lib/log.js')('file-cache');

const cache = {};

function read(filepath, key) {
  return get(cache[filepath] || {}, key);
}

function add(filepath, key, data) {
  watcher.add(filepath);
  cache[filepath] = set(cache[filepath] || {}, key, data);
  log.info(`caching ${key} ${filepath}`);
}

function remove(filepath) {
  watcher.remove(filepath);
  delete cache[filepath];
  log.info(`removing ${filepath}`);
}

function reset() {
  for (let key in cache) {
    remove(key);
  }

  watcher.close();
  init();
}

function init() {
  watcher.on('change', ({ filepath }) => {
    log.info(`external change ${filepath}`);
    remove(filepath);
  });

  watcher.on('error', err => {
    remove(err.filepath);
    log.error(err);
  });
}

init();

module.exports = { read, add, remove, reset };
