/* global postMessage */

const fs = require('fs-extra');
const dcraw = require('dcraw');

const bufferToUrl = require('../renderer/tools/bufferToUrl.js');
const log = require('../lib/log.js')('worker');

async function readFileBuffer(filepath) {
  if (Buffer.isBuffer(filepath)) {
    return filepath;
  }

  const file = await fs.readFile(filepath);

  return file;
}

async function imageUint8Array(filepath) {
  return await log.timing('preview', async () => {
    const file = await readFileBuffer(filepath);

    // read image from raw data
    // var tiff = dcraw(file, { exportAsTiff: true });

    const preview = dcraw(file, { extractThumbnail: true });

    return preview;
  });
}

async function imageUrl(filepath) {
  const data = bufferToUrl(await imageUint8Array(filepath));

  return data;
}

async function tiffBuffer(filepath) {
  return await log.timing('tiff', async () => {
    const file = await readFileBuffer(filepath);

    // read image from raw data
    const tiff = dcraw(file, {
      setNoAutoBrightnessMode: true,
      useCameraWhiteBalance: true,
      exportAsTiff: true,
      setFourColorMode: true,
    });

    return tiff;
  });
}

function exec(data) {
  function onDone(err, res) {
    const result = {
      type: 'done',
      epoch: Date.now()
    };

    if (err) {
      result.err = err;
    } else {
      result.data = res;
    }

    postMessage(result);
  }

  function execPromise(prom) {
    prom.then(data => {
      onDone(null, data);
    }).catch(err => {
      onDone(err);
    });
  }

  if (data.name === 'imageUint8Array') {
    return execPromise(imageUint8Array(...data.args));
  }

  if (data.name === 'imageUrl') {
    return execPromise(imageUrl(...data.args));
  }

  if (data.name === 'tiffBuffer') {
    return execPromise(tiffBuffer(...data.args));
  }

  onDone(new Error(`${data.name} is an unknown worker command`));
}

// eslint-disable-next-line no-undef
onmessage = (ev) => {
  const data = ev.data;

  if (data.type === 'exec') {
    return exec(data);
  }

  log.info('worker received message', ev);
};

postMessage({ type: 'ready' });
