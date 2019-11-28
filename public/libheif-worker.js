/* global postMessage */

const { libheif: libpath } = require('../lib/third-party.js');
const libheif = require(libpath);
const fs = require('fs-extra');

const name = 'libheif-worker';
const timing = require('../lib/timing.js')(name);

const getData = (image, width, height) => new Promise((resolve, reject) => {
  // use a clamped array for correct color, pass in fake canvas ImageData object
  image.display({ data: new Uint8ClampedArray(width*height*4), width, height }, (displayData) => {
    if (!displayData) {
      return reject(new Error('HEIF processing error'));
    }

    // get the ArrayBuffer from the Uint8Array
    resolve(displayData.data.buffer);
  });
});

const raw = async (filepath) => {
  const { data, image, width, height } = await timing({
    label: `decode ${filepath}`,
    func: async () => {
      const file = await fs.readFile(filepath);
      const decoder = new libheif.HeifDecoder();
      const data = decoder.decode(file);

      if (!data.length) {
        throw new Error(`no HEIF image found in ${filepath}`);
      }

      const image = data[0];
      const width = image.get_width();
      const height = image.get_height();

      return { data, image, width, height };
    }
  });

  const arrayBuffer = await timing({
    label: `copy data ${filepath}`,
    func: async () => await getData(image, width, height, 4)
  });

  // TODO is this needed? seems like this memory is collected the
  // same way regardless of this free call
  for (let img of data) {
    img.free();
  }

  return { width, height, data: arrayBuffer };
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
