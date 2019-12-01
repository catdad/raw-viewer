/* global postMessage, OffscreenCanvas */

const { readPsd, initializeCanvas } = require('ag-psd');
const fs = require('fs-extra');

const name = 'psd-worker';
const timing = require('../lib/timing.js')(name);

const createCanvas = (width, height) => {
  const canvas = new OffscreenCanvas(width, height);
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
const createCanvasFromData = () => {
  throw new Error('createCanvasFromData not implemented for Web Workers');
};

initializeCanvas(createCanvas, createCanvasFromData);

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
