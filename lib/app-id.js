const get = require('lodash/get');
const pkg = require('../package.json');
const { info } = require('./log.js')('app-id');

module.exports = (app) => {
  if (app.setAppUserModelId) {
    const appId = get(pkg, 'appId') || get(pkg, 'build.appId');
    info(`setting app id "${appId}"`);
    app.setAppUserModelId(appId);
  }
};
