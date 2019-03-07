const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');
const _ = require('lodash');

const exifToolLib = require('node-exiftool');
const exifToolBin = require('dist-exiftool');
const exifTool = new exifToolLib.ExiftoolProcess(exifToolBin);

const log = require('./log.js')('exiftool');

const operations = {};

function execWithHooks({ afterSuccess = null, afterError = null, lockfile = null }, func, filepath, ...args) {
  const lockname = lockfile || filepath;

  if (operations[lockname]) {
    log.info('queueing operation on', lockname);
    // this file is already being used, so we'll wait to
    // perform the following operation
    return operations[lockname].then(() => {
      return execWithHooks({ afterSuccess, afterError, lockfile }, func, filepath, ...args);
    }).catch(() => {
      return execWithHooks({ afterSuccess, afterError, lockfile }, func, filepath, ...args);
    });
  }

  const prom = exifTool[func](filepath, ...args).then(async data => {
    if (afterSuccess) {
      await afterSuccess();
    }

    delete operations[lockname];
    return Promise.resolve(data);
  }).catch(async err => {
    log.error(filepath, err);

    if (afterError) {
      await afterError();
    }

    delete operations[lockname];
    return Promise.reject(err);
  });

  operations[filepath] = prom;

  return prom;
}

function exec(func, filepath, ...args) {
  return execWithHooks({}, func, filepath, ...args);
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

    prom = exifTool.open({ detached: false });
    await prom;
    done = true;

    return;
  };

  log.time('exiftool:boot');

  // initalize once on startup
  initOnce().then(() => {
    log.timeEnd('exiftool:boot');
    log.info('exiftool started');
  }).catch(err => {
    log.timeEnd('exiftool:boot');
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

  const data = await log.timing(
    `exif ${filepath}`,
    async () => await exec('readMetadata', filepath, ['-File:all'])
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

  const data = await log.timing(
    `jpeg ${filepath}`,
    async () => await exec('readMetadata', filepath, [
      'Duration', // used to detect video files
      'Orientation',
      'JpgFromRawLength',
      'JpgFromRawStart',
      'PreviewImageLength',
      'PreviewImageStart',
      'ThumbnailOffset',
      'ThumbnailLength',
      'Rating'
    ])
  );

  if (data.error) {
    return {
      error: data.error
    };
  }

  const {
    Duration,
    Orientation,
    JpgFromRawLength,
    JpgFromRawStart,
    PreviewImageLength,
    PreviewImageStart,
    ThumbnailOffset,
    ThumbnailLength,
    Rating
  } = data.data[0];

  if (Duration !== undefined) {
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

  return {
    orientation: Orientation,
    rating: Rating || 0,
    start: JpgFromRawStart || PreviewImageStart,
    length: JpgFromRawLength || PreviewImageLength,
    thumbStart: ThumbnailOffset || PreviewImageStart,
    thumbLength: ThumbnailLength || PreviewImageLength
  };
}

async function upsertRating(filepath, rating = 0) {
  await initExiftool();

  // I don't know if this is universal, but the Windows properties
  // view requires Rating and RatingPercent in order to display
  // the new rating. If I only set Rating, it will still show the
  // old rating.
  const percentMap = {
    '1': 1,
    '2': 25,
    '3': 50,
    '4': 75,
    '5': 99
  };

  await log.timing(
    `rating ${filepath}`,
    async () => await execWithHooks({}, 'writeMetadata', filepath, {
      'Rating': rating || '',
      'RatingPercent': percentMap[rating] || ''
    }, ['overwrite_original'])
  );

  return readJpegMeta(filepath);
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
}

function close() {
  return exifTool.close();
}

module.exports = { open, close };
