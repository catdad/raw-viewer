const { promisify } = require('utils');

const ua = require('universal-analytics');
const uuid = require('uuid/v4');

const name = 'analytics';
const log = require('./log.js')(name);
const config = require('./config.js');
const isomorphic = require('./isomorphic.js');
const pkg = require('../package.json');

const code = '\x55\x41\x2d\x36\x37\x34\x32\x34\x33\x31\x32\x2d\x32';
const id = (() => {
  const key = 'anonymousId';
  let id = config.getProp(key);

  if (id) {
    return id;
  }

  id = uuid();
  config.setProp(key, id);

  return id;
})();

const visitor = ua(code, id, { aip: 1 });

const uaScreenview = silent(visitor.screenview.bind(visitor));
const uaEvent = silent(visitor.event.bind(visitor));

function silent(func) {
  const promiseFunc = promisify(func);
  return (...args) => {
    return promiseFunc(...args).catch(err => {
      log.error(err);
    });
  };
}

function screenview(screenName) {
  return uaScreenview({
    cd: screenName,
    an: pkg.productName || pkg.name,
    av: pkg.version,
    aip: 1 // anonymize  ip
  });
}

function event(category, action, label, value) {
  return uaEvent({
    ec: category,
    ea: action,
    el: label,
    ev: value,
    aip: 1 // anonymize  ip
  });
}

screenview('app');

module.exports = isomorphic({ name, implementation: {
  event,
  screenview
} });
