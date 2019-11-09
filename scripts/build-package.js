/* eslint-disable no-console */
const { promisify } = require('util');
const { pipeline } = require('stream');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const del = require('del');
const root = require('rootrequire');
const packager = require('electron-packager');
const archiver = require('archiver');
const argv = require('yargs-parser')(process.argv.slice(2));
const version = argv.version || null;
const tag = (typeof argv.tag === 'string') ? `v${argv.tag}` : null;
const shellton = require('shellton');

const pkg = require('../package.json');
const { transferSh } = require('./lib.upload.js');

const platform = process.platform;

const dirs = {
  win32: path.resolve(root, `dist/${pkg.productName}-win32-x64`),
  darwin: path.resolve(root, `dist/${pkg.productName}-darwin-x64`),
  linux: path.resolve(root, `dist/${pkg.productName}-linux-x64`),
};

const name = `Raw-Viewer-${tag || version || `v${pkg.version}-DEV`}`;

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
  'test/**',
  '.raw-viewer-config.json',
  './.*',
  'appveyor.yml'
];

const shell = (...args) => new Promise((resolve, reject) => {
  shellton(...args, err => err ? reject(err) : resolve());
});

const winZip = async () => {
  const filepath = path.resolve(`dist/${name}-Windows-portable.zip`);
  console.log('Creating Windows portable zip', filepath);

  await fs.remove(filepath);
  await fs.ensureFile(filepath);

  const archive = archiver('zip', {
    zlib: { level: 9 } // zlib.constants.Z_BEST_COMPRESSION
  });

  archive.directory(dirs.win32, '');
  archive.finalize();

  await promisify(pipeline)(archive, fs.createWriteStream(filepath));

  return filepath;
};

const darwinZip = async () => {
  const filepath = path.resolve(`dist/${name}-MacOS-portable.zip`);
  console.log('Creating MacOS portable zip', filepath);

  const args = [
    '-r',
    '--quiet',
    '--symlinks',
    filepath,
    './'
  ];

  await promisify(execFile)('zip', args, {
    env: process.env,
    cwd: dirs.darwin
  });

  return filepath;
};

const linuxTar = async () => {
  const filepath = path.resolve(`dist/${name}-Linux-portable.tar.gz`);

  await promisify(execFile)('tar', [
    'cfz',
    filepath,
    '-C', dirs.linux,
    '.'
  ]);

  return filepath;
};

const windowsBuild = async () => {
  const prepackaged = dirs[platform];

  await shell({
    task: `electron-builder --win --prepackaged "${prepackaged}"`,
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit'
  });
};

const upload = async (filename) => {
  try {
    console.table(await transferSh(path.resolve(root, 'dist', filename)));
  } catch (e) {
    console.log('upload failed with error:');
    console.log(e);
  }
};

console.time('done in');
(async () => {
  await fs.remove(dirs[platform]);

  console.time('package built in');
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
  console.timeEnd('package built in');

  let filepath;

  console.time('package zipped in');
  if (platform === 'win32') {
    filepath = await winZip();
  } else if (platform === 'darwin') {
    filepath = await darwinZip();
  } else if (platform === 'linux') {
    filepath = await linuxTar();
  }
  console.timeEnd('package zipped in');

  console.time('compiled package in');
  if (platform === 'win32') {
    await windowsBuild();
  }
  console.timeEnd('compiled package in');

  if (argv.upload && filepath) {
    console.time('uploaded in');
    await upload(filepath);
    console.timeEnd('uploaded in');
  }
})().then(() => {
  console.timeEnd('done in');
  console.log('Build complete');
}).catch(err => {
  console.timeEnd('done in');
  console.log('Build failed');
  console.error(err);
  process.exitCode = 1;
});
