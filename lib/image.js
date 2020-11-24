/* global document, Blob, Image, ImageData */

const fs = require('fs-extra');
const utif = require('utif');
const exifr = require('exifr');

const config = require('./config.js');
const timing = require('./timing.js')('lib/image');
const optional = require('./require-optional.js');

const sharp = process.platform === 'linux' ? null : optional('sharp');

const elem = name => document.createElement(name);

const useSharp = async () => {
  if (!sharp) {
    return false;
  }

  return !(await config.getProp('experiments.disableSharp'));
};

const loadUrl = (img, url) => {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = e => reject(e);
    img.src = url;
  });
};

const toBlob = (canvas, type = 'image/jpeg', quality = 0.92) => new Promise(resolve => {
  canvas.toBlob(blob => {
    resolve(blob);
  }, type, quality);
});

const canvasToJpeg = async canvas => {
  const blob = await toBlob(canvas);
  return Buffer.from(await blob.arrayBuffer());
};

const bufferToCanvas = async (buffer, width = null, rotation = 0) => {
  const blob = new Blob([buffer.buffer]);
  const img = new Image();
  const url = URL.createObjectURL(blob);
  await loadUrl(img, url);
  URL.revokeObjectURL(url);

  const canvas = elem('canvas');
  const ctx = canvas.getContext('2d');

  const { naturalWidth, naturalHeight } = img;

  const tw = width ? Math.min(width, naturalWidth) : naturalWidth;
  const th = width ? parseInt(naturalHeight * tw / naturalWidth) : naturalHeight;

  canvas.width = tw;
  canvas.height = th;

  if (rotation) {
    if (rotation !== 180) {
      canvas.width = th;
      canvas.height = tw;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation*Math.PI/180);
    ctx.scale(tw / naturalWidth, tw / naturalWidth);
    ctx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);
    ctx.setTransform(1,0,0,1,0,0);
  } else {
    ctx.drawImage(img, 0, 0, tw, th);
  }

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

const resizeJpeg = async (data, { width = null, rotation = 0 }) => {
  const USE_SHARP = await useSharp();
  const ROTATION = {
    'Horizontal (normal)': 0,
    'Rotate 90 CW': 90,
    'Rotate 270 CW': 270
  };

  return await timing({
    label: `resize-jpeg-${USE_SHARP ? 'sharp' : 'canvas'}`,
    func: async () => {
      if (USE_SHARP) {
        return await sharp(data)
          .rotate(rotation || undefined)
          .resize(width)
          .toBuffer();
      }

      const result = (await exifr.parse(data, ['Orientation'])) || {};

      const { Orientation } = result;

      if (rotation === ROTATION[Orientation]) {
        return width === null ?
          data :
          await bufferToCanvas(data, width);
      }

      return await bufferToCanvas(data, width, rotation);
    }
  });
};

const bufferToJpeg = async data => {
  const USE_SHARP = await useSharp();

  return await timing({
    label: `buffer-to-jpeg-${USE_SHARP ? 'sharp' : 'canvas'}`,
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
  const USE_SHARP = await useSharp();

  return await timing({
    label: `image-data-to-jpeg-${USE_SHARP ? 'sharp' : 'canvas'}`,
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
  const USE_SHARP = await useSharp();

  return await timing({
    label: `tiff-to-jpeg-${USE_SHARP ? 'sharp' : 'canvas'}`,
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
