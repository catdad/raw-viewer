const { get, set } = require('lodash');
const log = require('../../lib/log.js')('cache-meta');
const watcher = require('./cache-watcher.js');

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

  watcher.reset();
}

watcher.on('change', filepath => remove(filepath));

module.exports = { read, add, remove, reset };
