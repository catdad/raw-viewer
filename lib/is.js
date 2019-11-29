const get = require('lodash/get');
const electron = require('electron');
const app = get(electron, 'app') || get(electron, 'remote.app');

module.exports = {
  main: process.type === 'browser',
  renderer: process.type === 'renderer',
  worker: process.type === 'worker',
  prod: app ? app.isPackaged : true,
  // ugh, this probably shouldn't be here
  userData: app ? app.getPath('userData') : null
};
