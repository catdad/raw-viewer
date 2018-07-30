const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const root = require('./root.js');
const { log, error } = require('./log.js')('config');

const location = path.resolve(root, 'config.json');

let operation;
let configObj = {};

function perform(func) {
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
}

function read() {
  return perform(function () {
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
  });
}

function write() {
  return perform(function () {
    return read().then(function (config) {
      return fs.writeFile(location, JSON.stringify(config, null, 2));
    });
  });
}

const autoSave = _.debounce(function () {
  log('auto saving');

  write().then(function () {
    log('auto save done');
  }).catch(function (err) {
    error('auto save error', err);
  });
}, 1000);

function getProp(name) {
  return _.get(configObj, name);
}

function setProp(name, value) {
  _.set(configObj, name, value);
  autoSave();
}

module.exports = {
  read, write,
  getProp, setProp
};
