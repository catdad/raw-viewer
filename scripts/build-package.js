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
const icon = require('./lib.icon.js');
const { wsend: artifact } = require('./lib.upload.js');

const platform = process.platform;

const dist = path.resolve(root, 'dist');
const dirs = {
  win32: path.resolve(dist, `${pkg.productName}-win32-x64`),
  darwin: path.resolve(dist, `${pkg.productName}-darwin-x64`),
  linux: path.resolve(dist, `${pkg.productName}-linux-x64`),
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
  'assets/**',
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

const build = async (args) => {
  const prepackaged = dirs[platform];

  await shell({
    task: `electron-builder --prepackaged "${prepackaged}" --publish never ${args}`,
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit'
  });
};

const upload = async (filename) => {
  try {
    console.table(await artifact(path.resolve(root, 'dist', filename)));
  } catch (e) {
    console.log('upload failed with error:');
    console.log(e);
  }
};

const autoUpload = async () => {
  const patterns = [
    /MacOS-portable\.zip$/,
    /setup\.dmg$/,
    /Linux-portable\.tar\.gz$/
  ];

  const dir = await fs.readdir(dist, { withFileTypes: true });
  const files = dir
    .filter(f => f.isFile())
    .filter(f => !!patterns.find(p => !!p.test(f)));

  console.log('found files:', files);

  for (let file of files) {
    await upload(file);
  }
};

console.time('done in');
(async () => {
  await fs.remove(dist);

  console.time('create icons');
  await icon.prepare();
  console.timeEnd('create icons');

  console.time('package built in');
  await packager({
    dir: root,
    afterCopy: [wrapHook(async (buildPath) => {
      await del(ignore, {
        cwd: buildPath,
        dot: true
      });
    })],
    out: 'dist',
    icon: icon.path
  });
  console.timeEnd('package built in');

  console.time('package zipped in');
  if (platform === 'win32') {
    await winZip();
  } else if (platform === 'darwin') {
    await darwinZip();
  } else if (platform === 'linux') {
    await linuxTar();
  }
  console.timeEnd('package zipped in');

  console.time('compiled package in');
  if (platform === 'win32') {
    await build('--win');
  } else if (platform === 'darwin') {
    await build('--mac');
  }
  console.timeEnd('compiled package in');

  if (argv.upload) {
    console.time('uploaded in');
    await autoUpload();
    console.timeEnd('uploaded in');
  }
})().then(() => {
  console.timeEnd('done in');
  console.log('Build complete');
}).catch(err => {
  console.timeEnd('done in');
  console.log('Build failed');
  console.error(err);
  console.error(err.stack);
  process.exitCode = 1;
});
