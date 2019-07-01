const { promisify } = require('util');

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

function silent(func) {
  const promiseFunc = promisify(func);
  return (...args) => {
    return promiseFunc(...args).catch(err => {
      log.error(err);
    });
  };
}

let uaScreenview, uaEvent;

function setup() {
  if (uaScreenview && uaEvent) {
    return;
  }

  const visitor = ua(code, id);
  visitor.set('aip', '1'); // anonymize  ip
  visitor.set('cid', id);
  visitor.set('ds', 'app'); // specify all data is application data

  uaScreenview = silent(visitor.screenview.bind(visitor));
  uaEvent = silent(visitor.event.bind(visitor));
}

function screenview(screenName) {
  setup();

  return uaScreenview({
    cd: screenName,
    an: pkg.productName || pkg.name,
    av: pkg.version
  });
}

function event(category, action, label, value) {
  setup();

  return uaEvent({
    ec: category,
    ea: action,
    el: label,
    ev: value
  });
}

module.exports = isomorphic({ name, implementation: {
  event,
  screenview
} });
