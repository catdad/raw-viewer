const { get, set } = require('lodash');
const watcher = require('./dirty-watcher.js')();
const log = require('../../lib/log.js')('file-cache');

const cache = {};

function read(filepath, key) {
  return get(cache[filepath] || {}, key);
}

function add(filepath, key, data) {
  watcher.add(filepath);
  cache[filepath] = set(cache[filepath] || {}, key, data);
  log.info(`caching ${filepath}`);
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
}

watcher.on('change', filepath => {
  remove(filepath);
});

module.exports = { read, add, remove, reset };
