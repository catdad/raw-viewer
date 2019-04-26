/* eslint-disable no-console */
const { promisify } = require('util');
const { pipeline } = require('stream');
const path = require('path');
const fs = require('fs-extra');
const del = require('del');
const root = require('rootrequire');
const packager = require('electron-packager');
const archiver = require('archiver');
const zip = require('electron-installer-zip');
const fetch = require('node-fetch');
const FormData = require('form-data');
const argv = require('yargs-parser')(process.argv.slice(2));
const version = argv.version || null;
const tag = (typeof argv.tag === 'string') ? `v${argv.tag}` : null;

const pkg = require('../package.json');

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

const winZip = async () => {
  const filepath = `dist/${name}-Windows-portable.zip`;
  console.log('Creating Windows portable zip', filepath);

  await fs.remove(filepath);
  await fs.ensureFile(filepath);

  const archive = archiver('zip', {
    zlib: { level: 9 } // zlib.constants.Z_BEST_COMPRESSION
  });

  archive.directory(dirs.win32, '');
  archive.finalize();

  await promisify(pipeline)(archive, fs.createWriteStream(filepath));
};

const darwinZip = async () => {
  const filepath = `dist/${name}-MacOS-portable.zip`;
  console.log('Creating MacOS portable zip', filepath);

  await promisify(zip)({
    dir: path.resolve(dirs.darwin, 'Raw Viewer.app'),
    out: filepath
  });
};

const darwinUpload = async () => {
  const url = 'https://file.io';
  const filename = `${name}-MacOS-portable.zip`;
  const filepath = `dist/${filename}`;
  console.log(`Uploading ${filepath} to ${url}`);

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filepath), {
      filename: filename
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });

    const txt = await res.text();

    try {
      const json = JSON.parse(txt);

      if (json.success) {
        console.table(json);
      } else {
        throw new Error('not successful');
      }
    } catch (e) {
      console.log(`upload failed with ${res.statusCode} and body:`);
      console.log(txt);
    }
  } catch (e) {
    console.log('upload failed with error:');
    console.log(e);
  }
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
  } else if (platform === 'darwin') {
    await darwinZip();

    if (argv.upload) {
      await darwinUpload();
    }
  }
})().then(() => {
  console.log('Build complete');
}).catch(err => {
  console.log('Build failed');
  console.error(err);
  process.exitCode = 1;
});
