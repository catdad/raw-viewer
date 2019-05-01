const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');
const _ = require('lodash');

const exifTool = require('./exiftool-process.js');

const log = require('./log.js')('exiftool');

const operations = {};

function execWithHooks({ lockfile, afterSuccess = null, afterError = null }, func, args) {
  if (!lockfile) {
    return Promise.reject('lockfile is required');
  }

  if (operations[lockfile]) {
    log.info('queueing operation on', lockfile);
    // this file is already being used, so we'll wait to
    // perform the following operation
    return operations[lockfile].then(() => {
      return execWithHooks({ lockfile, afterSuccess, afterError }, func, args);
    }).catch(() => {
      return execWithHooks({ lockfile, afterSuccess, afterError }, func, args);
    });
  }

  const prom = exifTool[func](args).then(async data => {
    if (afterSuccess) {
      await afterSuccess();
    }

    delete operations[lockfile];

    if (data.error) {
      return Promise.reject(new Error(data.error));
    }

    return Promise.resolve(data.out[0]);
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

  return await log.timing(
    `exif ${filepath}`,
    async () => await execWithHooks({ lockfile: filepath }, 'executeJson', [
      '--File:all',
      filepath
    ])
  );
}

async function queryMeta(filepath, keys) {
  await initExiftool();

  return await log.timing(
    `query meta ${filepath}`,
    async () => execWithHooks({ lockfile: filepath }, 'executeJson', keys.map(k => `-${k}`).concat([
      filepath
    ]))
  );
}

async function readJpegMeta(filepath) {
  await initExiftool();

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
  } = await queryMeta(filepath, [
    'Duration', // used to detect video files
    'CompatibleBrands', // used to detect cr3 files that are not video but totally look like video
    'Orientation',
    'AutoRotate',
    'JpgFromRawLength',
    'JpgFromRawStart',
    'PreviewImageLength',
    'PreviewImageStart',
    'ThumbnailOffset',
    'ThumbnailLength',
    // temp - CR3 files should fall back to DCRAW, because it's faster
    // 'MovieDataOffset',
    // 'MovieDataSize',
    'Rating',
  ]);

  const isCrx = CompatibleBrands && CompatibleBrands.map && CompatibleBrands.map(s => s.toString().trim()).includes('crx');
  const isMovie = Duration !== undefined && !isCrx;

  if (isMovie) {
    throw new Error('video files are not supported');
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

  await log.timing(
    `copy exif from ${filepath} to ${targetpath}`,
    async () => await execWithHooks({ lockfile: filepath }, 'execute', [
      '-TagsFromFile',
      filepath,
      '-All:All>All:All',
      '-overwrite_original',
      targetpath
    ])
  );
}

function open(receive, send) {
  function createCallback(id) {
    const cbName = `exiftool:callback:${id}`;

    return function (err, data) {
      const threadTimestamp = Date.now();

      if (err) {
        return send(cbName, {
          ok: false,
          err: err.message,
          threadTimestamp
        });
      }

      return send(cbName, {
        ok: true,
        value: data,
        threadTimestamp
      });
    };
  }

  const handle = async (id, func) => {
    let data;
    const callback = createCallback(id);

    try {
      data = await func();
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  };

  receive('exiftool:read:fullmeta', async (ev, { filepath, id }) => {
    handle(id, async () => {
      let [ data, size ] = await Promise.all([
        readExif(filepath),
        fileSize(filepath)
      ]);

      // use incorrect (format-wise) tag names, to hopefully make it clear
      // these are not proper exif or maker tags
      _.set(data, 'Z-FileBytes', size);
      _.set(data, 'Z-FileSize', prettyBytes(size));

      return data;
    });
  });

  receive('exiftool:query:meta', async (ev, { filepath, id, keys }) => {
    handle(id, async () => await queryMeta(filepath, keys));
  });

  receive('exiftool:read:shortmeta', async (ev, { filepath, id }) => {
    handle(id, async () => await readJpegMeta(filepath));
  });

  receive('exiftool:set:rating', async (ev, { filepath, id, rating }) => {
    handle(id, async () => await upsertRating(filepath, rating));
  });

  receive('exiftool:copy:exif', async (ev, { filepath, id, targetpath }) => {
    handle(id, async () => await copyExif(filepath, targetpath));
  });
}

function close() {
  return exifTool.close();
}

module.exports = { open, close };
