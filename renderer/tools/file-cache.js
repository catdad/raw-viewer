const chokidar = require('chokidar');
const watcher = chokidar.watch('');
const log = require('../../lib/log.js')('file-cache');

const cache = {};

function get(filepath) {
  return cache[filepath] || null;
}

function add(filepath, data) {
  watcher.add(filepath);
  cache[filepath] = data;
  log.info(`caching ${filepath}`);
}

function remove(filepath) {
  watcher.unwatch(filepath);
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

module.exports = { get, add, remove, reset };
