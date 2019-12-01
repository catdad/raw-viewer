/* global postMessage, OffscreenCanvas */

const { readPsd, initializeCanvas } = require('ag-psd');
const fs = require('fs-extra');

const name = 'psd-worker';
const timing = require('../lib/timing.js')(name);

const createCanvas = function (width, height) {
  const canvas = new OffscreenCanvas(width, height);
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
const createCanvasFromData = function (data) {
  throw new Error('createCanvasFromData not implemented for Web Workers');

//  const canvas = new OffscreenCanvas(image.width, image.height);
//  const ctx = canvas.getContext('2d');
//  const imageData = ctx.createImageData(image.width, image.height);
//
//  for (let i = 0; i < data.length; i++) {
//    imageData.data[i] = data[i];
//  }
//
//  ctx.putImageData(imageData, 0, 0);
//
//  return canvas;
};

initializeCanvas(createCanvas, createCanvasFromData);

//const getData = (image, width, height) => new Promise((resolve, reject) => {
//  // use a clamped array for correct color, pass in fake canvas ImageData object
//  image.display({ data: new Uint8ClampedArray(width*height*4), width, height }, (displayData) => {
//    if (!displayData) {
//      return reject(new Error('HEIF processing error'));
//    }
//
//    // get the ArrayBuffer from the Uint8Array
//    resolve(displayData.data.buffer);
//  });
//});

const raw = async (filepath) => {
  return await timing({
    label: `decode image ${filepath}`,
    func: async () => {
      const file = await fs.readFile(filepath);
      const psd = readPsd(file, {
        skipLayerImageData: true,
        skipThumbnail: true // can't do thumbnails in web worker
      });
      const canvas = psd.canvas;

      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
      const data = await blob.arrayBuffer();

      if (!data.byteLength) {
        throw new Error(`PSD failed to render ${filepath}`);
      }

      return { data, width: canvas.width, height: canvas.height };
    }
  });
};

// eslint-disable-next-line no-undef
onmessage = ({ data }) => {
  raw(data.filepath).then(({ data, width, height }) => {
    postMessage({ type: 'done', epoch: Date.now(), data, width, height }, [data]);
  }).catch(err => {
    postMessage({ type: 'done', epoch: Date.now(), error: err });
  });
};

postMessage({ type: 'ready', epoch: Date.now() });

// Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': An OffscreenCanvas could not be cloned because it was not transferred.: DataCloneError

// Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': An OffscreenCanvas could not be cloned because it had a rendering context.: DataCloneError
