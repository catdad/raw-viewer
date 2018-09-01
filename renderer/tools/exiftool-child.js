const fs = require('fs-extra');
const ipc = require('electron').ipcRenderer;

const log = require('../../lib/log.js')('exiftool-child');
const dcraw = require('./dcraw.js')(2);
const bufferToUrl = require('./bufferToUrl.js');

const ROTATION = {
  'Horizontal (normal)': 0,
  'Rotate 90 CW': 90,
  'Rotate 270 CW': 270
};

function gid() {
  return Math.random().toString(36).substr(2);
}

function readExif(filepath) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      if (data.ok) {
        return resolve(data.value);
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:read:metadata', { filepath, id });
  });
}

function readShortMeta(filepath) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    log.time(`read short meta ${filepath}`);

    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      log.timeEnd(`read short meta ${filepath}`);

      if (data.ok) {
        return resolve(Object.assign(data.value, {
          filepath,
          rotation: ROTATION[data.value.orientation] || 0
        }));
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:read:jpegmeta', { filepath, id });
  });
}

async function readFilePart({ filepath, start, length }) {
  let buffer = Buffer.alloc(length);
  const fd = await fs.open(filepath, 'r');
  await fs.read(fd, buffer, 0, length, start);
  await fs.close(fd);

  return buffer;
}

async function readJpegFromMeta({ filepath, start, length }) {
  let buffer;

  if (start && length) {
    // we can get a fast jpeg image
    log.time(`read jpeg ${filepath}`);
    buffer = await readFilePart({ filepath, start, length });
    log.timeEnd(`read jpeg ${filepath}`);
  } else {
    log.time(`read dcraw ${filepath}`);
    // we should fall back to dcraw - e.g. Canon 30D
    buffer = Buffer.from(await dcraw.exec('imageUint8Array', [filepath]));
    log.timeEnd(`read dcraw ${filepath}`);
  }

  return bufferToUrl(buffer);
}

async function readThumbFromMeta(data) {
  let buffer;

  if (data.thumbStart && data.thumbLength) {
    log.time(`read thumb ${data.filepath}`);
    buffer = await readFilePart({
      filepath: data.filepath,
      start: data.thumbStart,
      length: data.thumbLength
    });
    log.timeEnd(`read thumb ${data.filepath}`);
  } else {
    buffer = await readJpegFromMeta(data);
  }

  return bufferToUrl(buffer);
}

function readThumb(filepath) {
  return readShortMeta(filepath)
    .then((data) => {
      return readThumbFromMeta(data).then(url => {
        return Object.assign({}, data, { url });
      });
    });
}

function readJpeg(filepath) {
  return readShortMeta(filepath)
    .then((data) => {
      return readJpegFromMeta(data).then(url => {
        return Object.assign({}, data, { url });
      });
    });
}

function setRating(filepath, rating = 0) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      if (data.ok) {
        return resolve(data.value);
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:set:rating', { filepath, id, rating });
  });
}

module.exports = {
  readExif,
  readShortMeta,
  readJpeg,
  readJpegFromMeta,
  readThumb,
  readThumbFromMeta,
  setRating
};
