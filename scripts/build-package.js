/* eslint-disable no-console */
const path = require('path');
const fs = require('fs-extra');
const del = require('del');
const root = require('rootrequire');
const packager = require('electron-packager');

const pkg = require('../package.json');

const platform = process.platform;

const dirs = {
  win32: path.resolve(root, `dist/${pkg.productName}-win32-x64`),
  darwin: path.resolve(root, `dist/${pkg.productName}-darwin-x64`),
  linux: path.resolve(root, `dist/${pkg.productName}-linux-x64`),
};

const wrapHook = hook => {
  return (buildPath, electronVersion, platform, arch, callback) => {
    hook(buildPath, electronVersion, platform, arch)
      .then(() => callback())
      .catch(err => callback(err));
  };
};

const ignore = [
  'dist/**',
  'scripts/**',
  'temp/**',
  '.raw-viewer-config.json',
  './.*'
];

(async () => {
  await fs.remove(dirs[platform]);

  await packager({
    dir: root,
    afterCopy: [wrapHook(async (buildPath) => {
      await del(ignore, {
        cwd: buildPath,
        dot: true
      });
    })],
    out: 'dist'
  });
})().then(() => {
  console.log('build complete');
}).catch(err => {
  console.log('build failed');
  console.error(err);
  process.exitCode = 1;
});
