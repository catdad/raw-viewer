/* global document, Blob, Image, ImageData */

const fs = require('fs-extra');
const sharp = require('sharp');
const utif = require('utif');

const timing = require('./timing.js')('IMAGE');

const elem = name => document.createElement(name);

const USE_SHARP = true;

const loadUrl = (img, url) => {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = e => reject(e);
    img.src = url;
  });
};

const toBlob = (canvas, type = 'image/jpeg', quality = 1) => new Promise(resolve => {
  canvas.toBlob(blob => {
    resolve(blob);
  }, type, quality);
});

const canvasToJpeg = async canvas => {
  const blob = await toBlob(canvas);
  return Buffer.from(await blob.arrayBuffer());
};

const bufferToCanvas = async (buffer, width = null) => {
  const blob = new Blob([buffer.buffer]);
  const img = new Image();
  const url = URL.createObjectURL(blob);
  await loadUrl(img, url);
  URL.revokeObjectURL(url);

  const canvas = elem('canvas');
  const ctx = canvas.getContext('2d');

  const { naturalWidth, naturalHeight } = img;

  const tw = width ? width : naturalWidth;
  const th = width ? parseInt(naturalHeight * width / naturalWidth) : naturalHeight;
  canvas.width = tw;
  canvas.height = th;
  ctx.drawImage(img, 0, 0, tw, th);

  return await canvasToJpeg(canvas);
};

const tiffToImageData = async buffer => {
  const ifds = utif.decode(buffer);
  const page = ifds[0];
  utif.decodeImage(buffer, page);
  const rgba = utif.toRGBA8(page);

  return {
    data: rgba,
    width: page.t256[0],
    height: page.t257[0]
  };
};

const resizeJpeg = async (data, width) => {
  return await timing({
    label: 'resize-jpeg',
    func: async () => {
      return USE_SHARP ?
        await sharp(data).resize(width).toBuffer() :
        await bufferToCanvas(data, width);
    }
  });
};

const bufferToJpeg = async data => {
  return await timing({
    label: 'buffer-to-jpeg',
    func: async () => {
      return USE_SHARP ?
        await sharp(data).jpeg().toBuffer() :
        await bufferToCanvas(data);
    }
  });
};

const pathToJpeg = async filepath => {
  return await bufferToJpeg(await fs.readFile(filepath));
};

const imageDataToJpeg = async (arrayBuffer, width, height)  => {
  return await timing({
    label: 'image-data-to-jpeg',
    func: async () => {
      if (USE_SHARP) {
        return await sharp(Buffer.from(arrayBuffer), {
          raw: { width, height, channels: 4 }
        }).jpeg().toBuffer();
      }

      // TODO this one is actually much slower, look into improving it

      const canvas = elem('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const data = new ImageData(new Uint8ClampedArray(arrayBuffer), width, height);
      ctx.putImageData(data, 0, 0);

      return await canvasToJpeg(canvas);
    }
  });
};

const tiffToJpeg = async buffer => {
  return await timing({
    label: 'tiff-to-jpeg',
    func: async () => {
      if (USE_SHARP) {
        return await bufferToJpeg(buffer);
      }

      const { data, width, height } = await tiffToImageData(buffer);
      return await imageDataToJpeg(data.buffer, width, height);
    }
  });
};

module.exports = {
  resizeJpeg,
  bufferToJpeg,
  pathToJpeg,
  imageDataToJpeg,
  tiffToJpeg
};
