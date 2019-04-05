/* eslint-disable no-console */
const { promisify } = require('util');
const { pipeline } = require('stream');
const path = require('path');
const fs = require('fs-extra');
const del = require('del');
const root = require('rootrequire');
const packager = require('electron-packager');
const archiver = require('archiver');

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

const winZip = async () => {
  console.log('Creating Windows portable zip');
  const name = `Raw-Viewer-${pkg.version}-Windows-portable`;
  const filepath = `dist/${name}.zip`;
  await fs.remove(filepath);
  await fs.ensureFile(filepath);

  const archive = archiver('zip', {
    zlib: { level: 9 } // zlib.constants.Z_BEST_COMPRESSION
  });

  archive.directory(dirs.win32);

  await promisify(pipeline)(archive, fs.createWriteStream(filepath));
};

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

  if (platform === 'win32') {
    await winZip();
  }
})().then(() => {
  console.log('Build complete');
}).catch(err => {
  console.log('Build failed');
  console.error(err);
  process.exitCode = 1;
});
