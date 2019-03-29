/* eslint-disable no-console */

const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const path = require('path');
const fs = require('fs-extra');
const root = require('rootrequire');
const fetch = require('node-fetch');
const unzip = require('unzip');
const tar = require('tar');

const version = '11.33';

const urls = {
  win: `http://downloads.sourceforge.net/project/exiftool/exiftool-${version}.zip`,
  linux: `https://downloads.sourceforge.net/project/exiftool/Image-ExifTool-${version}.tar.gz`
};

const responseStream = async url => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`failed response ${res.statusCode} ${res.statusMessage}`);
  }

  return res.body;
};

const unzipPromise = async (stream, outdir) => {
  let error;

  await new Promise((resolve, reject) => {
    pipeline(stream, unzip.Parse().on('entry', entry => {
      const name = entry.path;

      if (name !== 'exiftool(-k).exe') {
        return entry.autodrain();
      }

      pipeline(entry, fs.createWriteStream(path.resolve(outdir, 'exiftool.exe')))
        .then(() => {})
        .catch(err => { error = err; });
    })).then(() => resolve()).catch(err => reject(err));
  });

  if (error) {
    throw error;
  }
};

(async () => {
  const platform = process.platform === 'win32' ? 'win' : 'linux';
  const outdir = path.resolve(root, 'third-party/exiftool', platform);
  await fs.ensureDir(outdir);

  const archive = await responseStream(urls[platform]);

  if (platform === 'linux') {
    await pipeline(archive, tar.extract({
      cwd: outdir,
      strip: 1,
      filter: path => {
        if (path.indexOf(`Image-ExifTool-${version}/exiftool`) === 0) {
          return true;
        }

        if (path.indexOf(`Image-ExifTool-${version}/lib`) === 0) {
          return true;
        }

        return false;
      }
    }));
  } else {
    await unzipPromise(archive, outdir);
  }
})().then(() => {
  console.log('exiftool fetched successfully');
}).catch(err => {
  console.error('error fetching exiftool');
  console.error(err);
  process.exitCode = 1;
});
