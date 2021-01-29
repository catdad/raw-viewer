const log = require('./log.js')('optional dependency');

module.exports = name => {
  try {
    return require(name);
  } catch (e) {
    log.error(`failed to require "${name}"... this will be okay\n`, e);
    return null;
  }
};
