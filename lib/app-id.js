const pkg = require('../package.json');
const { info } = require('./log.js')('app-id');

module.exports = (app) => {
  if (app.setAppUserModelId) {
    info(`setting app id "${pkg.appId}"`);
    app.setAppUserModelId(pkg.appId);
  }
};
