const { spawn } = require('child_process');
const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');
const _ = require('lodash');

const exifTool = require('./exiftool-process.js');

const log = require('./log.js')('exiftool');

const operations = {};

function execWithHooks({ afterSuccess = null, afterError = null, lockfile }, func, args) {
  if (!lockfile) {
    return Promise.reject('lockfile is required');
  }

  if (operations[lockfile]) {
    log.info('queueing operation on', lockfile);
    // this file is already being used, so we'll wait to
    // perform the following operation
    return operations[lockfile].then(() => {
      return execWithHooks({ afterSuccess, afterError, lockfile }, func, args);
    }).catch(() => {
      return execWithHooks({ afterSuccess, afterError, lockfile }, func, args);
    });
  }

  const prom = exifTool[func](args).then(async data => {
    if (afterSuccess) {
      await afterSuccess();
    }

    delete operations[lockfile];
    return Promise.resolve(data);
  }).catch(async err => {
    log.error(lockfile, err);

    if (afterError) {
      await afterError();
    }

    delete operations[lockfile];
    return Promise.reject(err);
  });

  operations[lockfile] = prom;

  return prom;
}

function exec(func, filepath, args) {
  return execWithHooks({ lockfile: filepath }, func, args);
}

const initExiftool = (() => {
  let done = false;
  let prom;

  const initOnce = async () => {
    if (done) {
      return;
    }

    if (prom) {
      await prom;
      return;
    }

    prom = exifTool.open();
    await prom;
    done = true;

    return;
  };

  // initalize once on startup
  log.timing('exiftool:boot', () => initOnce()).then(() => {
    log.info('exiftool started');
  }).catch((err) => {
    log.error('exiftool error');
    log.error(err);
  });

  return initOnce;
})();

async function fileSize(filepath) {
  return (await fs.stat(filepath)).size;
}

async function readExif(filepath) {
  await initExiftool();

/*

write stdin --File:all
write stdin -json
write stdin -s
write stdin D:\Workspace\Photography\test-image-error\DNG.dng

*/

  const data = await log.timing(
    `exif ${filepath}`,
    async () => await exec('executeJson', filepath, [
      '--File:all',
      filepath
    ])
  );

  if (data.error) {
    return {
      error: data.error
    };
  }

  return data.data[0];
}

async function readJpegMeta(filepath) {
  await initExiftool();

/*

write stdin -Duration
write stdin -CompatibleBrands
write stdin -Orientation
write stdin -AutoRotate
write stdin -JpgFromRawLength
write stdin -JpgFromRawStart
write stdin -PreviewImageLength
write stdin -PreviewImageStart
write stdin -ThumbnailOffset
write stdin -ThumbnailLength
write stdin -MovieDataOffset
write stdin -MovieDataSize
write stdin -Rating
write stdin -json
write stdin -s
write stdin D:\Workspace\Photography\test-image-error\5-star.jpg

*/

  const data = await log.timing(
    `jpeg ${filepath}`,
    async () => await exec('executeJson', filepath, [
      '-Duration', // used to detect video files
      '-CompatibleBrands', // used to detect cr3 files that are not video but totally look like video
      '-Orientation',
      '-AutoRotate',
      '-JpgFromRawLength',
      '-JpgFromRawStart',
      '-PreviewImageLength',
      '-PreviewImageStart',
      '-ThumbnailOffset',
      '-ThumbnailLength',
      '-MovieDataOffset',
      '-MovieDataSize',
      '-Rating',
      filepath
    ])
  );

  if (data.error) {
    return {
      error: data.error
    };
  }

  const {
    Duration,
    CompatibleBrands,
    Orientation,
    AutoRotate,
    JpgFromRawLength,
    JpgFromRawStart,
    PreviewImageLength,
    PreviewImageStart,
    ThumbnailOffset,
    ThumbnailLength,
    MovieDataOffset,
    MovieDataSize,
    Rating
  } = data.data[0];

  const isCrx = CompatibleBrands && CompatibleBrands.map && CompatibleBrands.map(s => s.toString().trim()).includes('crx');
  const isMovie = Duration !== undefined && !isCrx;

  if (isMovie) {
    return {
      error: 'video files are not supported'
    };
  }

  // DNG (any)     - will have Jpeg props for full view and Preview props for thumbs
  // NEF (nikon)   - will have Jpeg props for full view and Preview props for thumbs
  // CR2 (canon)   - will have Preview props for full view and Thumbnail props for thumbs
  // ARW (sony)    - will have Preview props for full view and Thumbnail props for thumbs
  // ORF (olympus) - will have Preview props for both full image and thumbs
  // RAF (fuji)    - will fall back to dcraw for full view and Thumbnail props for thumbs
  // CR3 (canon)   - will use Movie props, because compression

  return {
    orientation: Orientation || AutoRotate,
    rating: Rating || 0,
    start: JpgFromRawStart || PreviewImageStart || MovieDataOffset,
    length: JpgFromRawLength || PreviewImageLength || MovieDataSize,
    thumbStart: ThumbnailOffset || PreviewImageStart || MovieDataOffset,
    thumbLength: ThumbnailLength || PreviewImageLength || MovieDataSize
  };
}

async function upsertRating(filepath, rating = 0) {
  await initExiftool();

  // I don't know if this is universal, but the Windows properties
  // view requires Rating and RatingPercent in order to display
  // the new rating. If I only set Rating, it will still show the
  // old rating.
  const percentMap = {
    '0': 0,
    '1': 1,
    '2': 25,
    '3': 50,
    '4': 75,
    '5': 99
  };

/*

write stdin -Rating=2
write stdin -RatingPercent=25
write stdin -overwrite_original
write stdin -json
write stdin -s
write stdin D:\Workspace\Photography\test-image-error\DNG.dng

*/

  await log.timing(
    `rating ${filepath}`,
    async () => await execWithHooks({ lockfile: filepath }, 'execute', [
      `-Rating=${rating}`,
      `-RatingPercent=${percentMap[rating] || 0}`,
      '-overwrite_original',
      filepath
    ])
  );

  return readJpegMeta(filepath);
}


async function copyExif(filepath, targetpath) {
  await initExiftool();

  // TODO: This is really slow because it has to launch a
  // new exiftool process. The node-exiftool library does not
  // support providing two files or having spaces in args.
  // Consider not using that module and just handling all the
  // communication directly.
  await log.timing(
    `copy exif from ${filepath} to ${targetpath}`,
    async () => {
      await new Promise((resolve, reject) => {
        const proc = spawn(exifToolBin, [
          '-TagsFromFile',
          filepath,
          '-All:All>All:All',
          '-overwrite_original',
          targetpath
        ]);

        proc.on('error', err => reject(err));

        proc.on('exit', code => {
          if (code === 0) {
            return resolve();
          }

          return reject(new Error(`exit code ${code}`));
        });
      });
    }
  );
}


function open(receive, send) {
  function createCallback(id) {
    const cbName = `exiftool:callback:${id}`;

    return function (err, data) {
      if (err) {
        return send(cbName, {
          ok: false,
          err: err.message
        });
      }

      return send(cbName, {
        ok: true,
        value: data
      });
    };
  }

  receive('exiftool:read:fullmeta', async (ev, { filepath, id }) => {
    let data, size;
    const callback = createCallback(id);

    try {
      [ data, size ] = await Promise.all([
        readExif(filepath),
        fileSize(filepath)
      ]);

      // use incorrect (format-wise) tag names, to hopefully make it clear
      // these are not proper exif or maker tags
      _.set(data, 'Z-FileBytes', size);
      _.set(data, 'Z-FileSize', prettyBytes(size));
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });

  receive('exiftool:read:shortmeta', async (ev, { filepath, id }) => {
    let data;
    const callback = createCallback(id);

    try {
      data = await readJpegMeta(filepath);
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });

  receive('exiftool:set:rating', async (ev, { filepath, id, rating }) => {
    let data;
    const callback = createCallback(id);

    try {
      data = await upsertRating(filepath, rating);
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });

  receive('exiftool:copy:exif', async (ev, { filepath, id, targetpath }) => {
    let data;
    const callback = createCallback(id);

    try {
      data = await copyExif(filepath, targetpath);
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });
}

function close() {
  return exifTool.close();
}

module.exports = { open, close };
