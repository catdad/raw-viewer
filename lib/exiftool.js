const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');
const _ = require('lodash');

const name = 'exiftool';
const log = require('./log.js')(name);
const timing = require('./timing.js')(name);
const isomorphic = require('./isomorphic.js');
const exifTool = require('./exiftool-process.js');
const analytics = require('./analytics.js');

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

    const dataError = _.get(data, 'error') || _.get(data, 'out.0.Error');

    if (dataError) {
      return Promise.reject(new Error(dataError));
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

const openOnce = (() => {
  let first = true;

  const initOnce = async () => {
    if (first) {
      first = false;
      await timing({
        label: 'exiftool:boot',
        func: async () => await exifTool.open()
      });
    }
  };

  return initOnce;
})();

function open() {
  return openOnce();
}

function close() {
  return exifTool.close();
}

async function fileSize(filepath) {
  return (await fs.stat(filepath)).size;
}

async function readMeta(filepath) {
  await open();

  return await timing({
    label: `exif ${filepath}`,
    func: async () => await execWithHooks({ lockfile: filepath }, 'executeJson', [
      '--File:all',
      filepath
    ])
  });
}

async function queryMeta(filepath, keys) {
  await open();

  return await timing({
    label: `query meta ${filepath}`,
    func: async () => execWithHooks({ lockfile: filepath }, 'executeJson', keys.map(k => `-${k}`).concat([
      filepath
    ]))
  });
}

async function readShortMeta(filepath) {
  await open();

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
    Rating,
    Format
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
    'Format'
  ]);

  const isPsd = Format && /photoshop/.test(Format);
  const isCrx = CompatibleBrands && CompatibleBrands.map && CompatibleBrands.map(s => s.toString().trim().toLowerCase()).includes('crx');
  const isHeic = CompatibleBrands && CompatibleBrands.map && CompatibleBrands.map(s => s.toString().trim().toLowerCase()).includes('heic');
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
  // RW2 (pana)    - will fall back to dcraw for full view and Thumbnail props for thumbs
  // CR3 (canon)   - will use Movie props, because compression

  return {
    orientation: Orientation || AutoRotate,
    rating: Rating || 0,
    start: JpgFromRawStart || PreviewImageStart || MovieDataOffset,
    length: JpgFromRawLength || PreviewImageLength || MovieDataSize,
    thumbStart: ThumbnailOffset || PreviewImageStart || MovieDataOffset,
    thumbLength: ThumbnailLength || PreviewImageLength || MovieDataSize,
    isPsd: !!isPsd,
    isHeic: !!isHeic
  };
}

async function setRating(filepath, rating = 0) {
  await open();

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

  await timing({
    label: `rating ${filepath}`,
    func: async () => await execWithHooks({ lockfile: filepath }, 'execute', [
      `-Rating=${rating}`,
      `-RatingPercent=${percentMap[rating] || 0}`,
      '-overwrite_original',
      filepath
    ])
  });

  return readShortMeta(filepath);
}

async function copyMeta(filepath, targetpath) {
  await open();

  await timing({
    label: `copy exif from ${filepath} to ${targetpath}`,
    func: async () => await execWithHooks({ lockfile: filepath }, 'execute', [
      '-TagsFromFile',
      filepath,
      '-All:All>All:All',
      '-overwrite_original',
      targetpath
    ])
  });
}

async function readFullMeta(filepath) {
  let [ data, size ] = await Promise.all([
    readMeta(filepath),
    fileSize(filepath)
  ]);

  // use incorrect (format-wise) tag names, to hopefully make it clear
  // these are not proper exif or maker tags
  _.set(data, 'Z-FileBytes', size);
  _.set(data, 'Z-FileSize', prettyBytes(size));

  reportAnalytics(data);

  return data;
}

function reportAnalytics(data) {
  [
    ['Model', 'camera'],
    ['LensID', 'lens'],
    ['FocalLength', 'focal-length'],
    ['FNumber', 'aperture'],
    ['ExposureTime', 'shutter-speed'],
    ['ISO', 'iso'],
  ].forEach(([key, name]) => {
    analytics.event('metadata', name, data[key]);
  });
}

const implementation = {
  open,
  close,
  readFullMeta,
  readShortMeta,
  queryMeta,
  copyMeta,
  setRating
};

module.exports = isomorphic({ name, implementation });
