const pkg = require('../package.json');
const appName = pkg.productName || pkg.name;
const appVersion = pkg.version;
const appData = require('app-data-folder')(appName);

const isPackaged = (() => {
  if (
    process.mainModule &&
    process.mainModule.filename.indexOf('app.asar') !== -1
  ) {
    return true;
  }

  if (process.argv.filter(a => a.indexOf('app.asar') !== -1).length > 0) {
    return true;
  }

  return false;
})();

module.exports = {
  appName,
  appVersion,
  main: process.type === 'browser',
  renderer: process.type === 'renderer',
  worker: process.type === 'worker',
  prod: isPackaged,
  appData
};
