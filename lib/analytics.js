const { promisify } = require('util');

const ua = require('universal-analytics');

const name = 'analytics';
const log = require('./log.js')(name);
const config = require('./config.js');
const isomorphic = require('./isomorphic.js');
const uuid = require('./uuid.js');

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

let uaEvent, uaPageview, uaTiming;

function setup() {
  if (uaPageview && uaEvent && uaTiming) {
    return;
  }

  const visitor = ua(code, id);
  visitor.set('aip', '1'); // anonymize  ip
  visitor.set('cid', id);

  uaEvent = silent(visitor.event.bind(visitor));
  uaPageview = silent(visitor.pageview.bind(visitor));
  uaTiming = silent(visitor.timing.bind(visitor));
}

function screenview(screenName) {
  setup();

  return uaPageview({ dp: `/${screenName}` });
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

async function timing(category, variable, duration) {
  setup();

  // Google only accept integer timings
  return uaTiming(category, variable, Math.round(duration));
}

module.exports = isomorphic({ name, implementation: {
  event,
  screenview,
  timing
} });
