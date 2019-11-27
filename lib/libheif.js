const { libheif: libpath } = require('./third-party.js');
const libheif = require(libpath);
const fs = require('fs-extra');
const sharp = require('sharp');

// TODO main thread (lib) should not import renderer files
const { urlToBuffer } = require('../renderer/tools/bufferToUrl.js');

const name = 'libheif';
const timing = require('./timing.js')(name);

const getData = (image) => new Promise((resolve, reject) => {
  image.display({ data: [] }, (displayData) => {
    if (!displayData) {
      return reject(new Error('HEIF processing error'));
    }

    resolve(new Uint8Array(displayData.data));
  });
});

const renderDataSharp = async (data, width, height, channels) => {
  return await sharp(Buffer.from(data), {
    raw: { width, height, channels }
  }).jpeg().toBuffer();
};

const renderDataCanvas = async (data, width, height) => {
  // eslint-disable-next-line no-undef
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < data.length; i++) {
    imageData.data[i] = data[i];
  }

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 1);

  return urlToBuffer(dataUrl);
};

const jpg = async (filepath) => {
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

  const displayData = await timing({
    label: `copy data ${filepath}`,
    func: async () => await getData(image)
  });

  // TODO is this needed? seems like this memory is collected the
  // same way regardless of this free call
  for (let img of data) {
    img.free();
  }

  return await timing({
    label: `render ${filepath}`,
    func: async () => await renderDataSharp(displayData, width, height, 4)
  });
};

module.exports = {
  jpg: async (filepath) => await timing({
    label: `full heif workflow ${filepath}`,
    func: () => jpg(filepath)
  })
};
