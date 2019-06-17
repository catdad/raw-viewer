const electron = require('electron');
const app = electron.app || electron.remote.app;

module.exports = {
  main: process.type === 'browser',
  renderer: process.type === 'renderer',
  prod: app.isPackaged
};
