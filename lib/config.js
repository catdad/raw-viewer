const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const electron = require('electron');

const root = require('./root.js');
const name = 'config';
const { info, error } = require('./log.js')(name);

const CB_CHANNEL = `${name}-channel`;

const is = {
  main: process.type === 'browser',
  renderer: process.type === 'renderer'
};

const location = process.env['RAW_VIEWER_CONFIG_PATH'] || path.resolve(root, '.raw-viewer-config.json');

let operation;
let configObj = {
  version: '1.0.0'
};

function gid() {
  return Math.random().toString(36).substr(2);
}

const renderer = {
  _send: (opname, args) => {
    const id = gid() + gid();

    return new Promise((resolve, reject) => {
      electron.ipcRenderer.once(`${name}:callback:${id}`, (ev, result) => {
        if (result.ok) {
          return resolve(result.value);
        }

        return reject(new Error(result.err));
      });

      electron.ipcRenderer.send(CB_CHANNEL, { id, opname, args });
    });
  },
  read: (...args) => renderer._send('read', args),
  write: (...args) => renderer._send('write', args),
  getProp: (...args) => renderer._send('getProp', args),
  setProp: (...args) => renderer._send('setProp', args),
};

const main = {
  _perform: func => {
    if (!operation) {
      operation = Promise.resolve();
    }

    return operation.then(function () {
      return func();
    }).then(function (result) {
      operation = null;
      return Promise.resolve(result);
    }).catch(function (err) {
      operation = null;
      return Promise.reject(err);
    });
  },
  _autoSave: _.debounce(() => {
    info('auto saving');

    main.write().then(function () {
      info('auto save done');
    }).catch(function (err) {
      error('auto save error', err);
    });
  }, 1000),
  read: () => main._perform(() => {
    return fs.readFile(location, 'utf8').then(function(file) {
      var json = JSON.parse(file);

      configObj = Object.assign(json, configObj);

      return Promise.resolve(configObj);
    }).catch(function (err) {
      if (err.code === 'ENOENT') {
        return Promise.resolve(configObj);
      }

      return Promise.reject(err);
    });
  }),
  write: () => main._perform(() => {
    return main.read().then(function (config) {
      return fs.writeFile(location, JSON.stringify(config, null, 2));
    });
  }),
  getProp: (name) => _.get(configObj, name),
  setProp: (name, value) => {
    _.set(configObj, name, value);
    main._autoSave();
  }
};

if (is.main && electron.ipcMain.listenerCount(CB_CHANNEL) === 0) {
  info('initializing main ipc');

  const callback = (ev, id) => (err, result) => {
    const cbName = `${name}:callback:${id}`;
    const threadTimestamp = Date.now();

    const send = ev.reply ? ev.reply.bind(ev) : ev.sender.send.bind(ev.sender);

    if (err) {
      return send(cbName, {
        ok: false,
        err: err.message,
        threadTimestamp
      });
    }

    return send(cbName, {
      ok: true,
      value: result,
      threadTimestamp
    });
  };

  electron.ipcMain.on(CB_CHANNEL, async (ev, { id, opname, args }) => {
    if (!main[opname]) {
      return callback(ev, id)(new Error(`unknown opname "${opname}"`));
    }

    try {
      const result = await main[opname](...args);
      return callback(ev, id)(null, result);
    } catch (e) {
      error(e);
      return callback(ev, id)(e);
    }
  });
}

module.exports = {
  read: is.main ? main.read : renderer.read,
  write: is.main ? main.write : renderer.write,
  getProp: is.main ? main.getProp : renderer.getProp,
  setProp: is.main ? main.setProp : renderer.setProp,
};
