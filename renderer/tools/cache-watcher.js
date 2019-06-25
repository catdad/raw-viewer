const events = new (require('events'));
const watcher = require('fs-watch-file')({ persistent: false });
const log = require('../../lib/log.js')('cache-watcher');

function add(filepath) {
  watcher.add(filepath);
}

function remove(filepath) {
  watcher.remove(filepath);
}

function reset() {
  watcher.close();
  init();
}

function init() {
  watcher.on('change', ({ filepath }) => {
    remove(filepath);
    events.emit('change', filepath);
  });

  watcher.on('error', err => {
    remove(err.filepath);
    log.error(err);
    events.emit('change', err.filepath);
  });
}

module.exports = events;
module.exports.add = add;
module.exports.remove = remove;
module.exports.reset = reset;
