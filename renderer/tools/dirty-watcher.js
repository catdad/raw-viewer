/* jshint esversion: 6, node: true */
const fs = require('fs');
const EventEmitter = require('events');

module.exports = () => {
  const files = {};
  const events = new EventEmitter();

  const add = (filepath) => {
    if (files[filepath]) {
      return;
    }

    const watcher = fs.watch(filepath, (eventType) => {
      if (eventType === 'change') {
        return events.emit('change', { file: filepath });
      }

      if (eventType === 'close' && !watcher._fwf_closed) {
        const error = new Error('watcher closed unexpectedly');
        error.code = 'UnexpectedClose';
        error.filepath = filepath;

        return events.emit('error', error);
      }

      if (eventType === 'error') {
        delete files[filepath];
        const error = new Error('file watch error');
        error.code = 'UnexpectedError';
        error.filepath = filepath;
        error._arguments = arguments;

        return events.emit('error', error);
      }
    });

    files[filepath] = watcher;
  };

  const remove = (filepath) => {
    const watcher = files[filepath];

    if (!watcher) {
      return;
    }

    watcher._fwf_closed = true;
    watcher.close();
    delete files[filepath];
  };

  const close = () => {

  };

  return {
    add,
    remove,
    close,
    on: events.on.bind(events),
    once: events.once.bind(events),
    off: events.removeListener.bind(events),
    removeAllListeners: events.removeAllListeners.bind(events)
  };
};
