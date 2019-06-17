const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const is = require('./is.js');
const root = require('./root.js');
const name = 'config';
const { info, error } = require('./log.js')(name);
const isomorphic = require('./isomorphic.js');

const location = process.env['RAW_VIEWER_CONFIG_PATH'] || path.resolve(is.prod ? is.userData : root, '.raw-viewer-config.json');

let operation;
let configObj = {
  version: '1.0.0'
};

const perform = func => {
  if (!operation) {
    operation = Promise.resolve();
  }

  return operation.then(() => {
    return func();
  }).then((result) => {
    operation = null;
    return Promise.resolve(result);
  }).catch((err) => {
    operation = null;
    return Promise.reject(err);
  });
};

const autoSave = _.debounce(() => {
  info('auto saving');

  implementation.write().then(() => {
    info('auto save done');
  }).catch((err) => {
    error('auto save error', err);
  });
}, 1000);

const implementation = {
  read: () => perform(async () => {
    try {
      const file = await fs.readFile(location, 'utf8');
      const json = JSON.parse(file);
      configObj = Object.assign(json, configObj);
      return configObj;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return configObj;
      }

      throw e;
    }
  }),
  write: () => perform(async () => {
    const config = await implementation.read();
    await fs.writeFile(location, JSON.stringify(config, null, 2));
  }),
  getProp: (name) => {
    if (Array.isArray(name)) {
      return name.map((prop) => {
        return _.get(configObj, prop);
      });
    }

    return _.get(configObj, name);
  },
  setProp: (name, value) => {
    _.set(configObj, name, value);
    autoSave();
  }
};

module.exports = isomorphic({ name, implementation });
