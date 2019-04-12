const path = require('path');
const fs = require('fs-extra');
const { dialog } = require('electron').remote;

const name = 'sidebar';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const exiftool = require('../tools/exiftool-child.js');
const log = require('../../lib/log.js')(name);

const renderKeyValue = ({ key, value }) => {
  const p = document.createElement('p');
  const keySpan = document.createElement('span');
  keySpan.style.opacity = 0.8;
  keySpan.style.fontSize = '0.9em';
  keySpan.appendChild(document.createTextNode(key));
  const valueSpan = document.createElement('span');
  valueSpan.style.fontWeight = 'bold';
  valueSpan.style.fontSize = '1.1em';
  valueSpan.appendChild(document.createTextNode(value));

  p.appendChild(keySpan);
  p.appendChild(document.createTextNode(': '));
  p.appendChild(valueSpan);

  return p;
};

const render = (meta) => {
  const fragment = document.createDocumentFragment();

  for (let i in meta) {
    fragment.appendChild(renderKeyValue({ key: i, value: meta[i]}));
  }

  return fragment;
};

const derive = (meta) => {
  const derived = {};

  // Canon has a lower and upper focus distance, while
  // others have a single value
  if (meta.FocusDistanceLower && meta.FocusDistanceUpper) {
    derived.FocusDistance = meta.FocusDistance ||
      `${meta.FocusDistanceLower} - ${meta.FocusDistanceUpper}`;
  }

  // Sony sometimes has FocusDistance2 instead of FocusDistance
  if (meta.FocusDistance2 && !meta.FocusDistance) {
    derived.FocusDistance = meta.FocusDistance2;
  }

  if (meta.CameraTemperature) {
    derived.Temperature = meta.CameraTemperature;
  }

  // how to define this has changed over time... just use
  // any of these
  derived.Artist = meta.Artist || meta.Creator || meta.OwnerName || undefined;

  derived.Orientation = meta.Orientation || meta.AutoRotate;

  return derived;
};

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  async function saveImage({ filepath, imageUrl, name }) {
    const outfile = await dialog.showSaveDialog({
      defaultPath: name
    });

    if (imageUrl === filepath) {
      await log.timing(
        `copy jpeg to ${outfile}`,
        async () => await fs.copy(filepath, outfile)
      );
      return;
    }

    await log.timing(
      `save jpeg preview to ${outfile}`,
      async () => {
        const base64 = imageUrl.split(';base64,').pop();
        const buffer = Buffer.from(base64, 'base64');

        await fs.outputFile(outfile, buffer);
        await exiftool.copyExif(filepath, outfile);
      }
    );
  }

  async function loadInfo({ filepath, imageUrl }) {
    const meta = await log.timing(
      `exif ${filepath}`,
      async () => await exiftool.readMeta(filepath)
    );

    const allMeta = Object.assign({}, meta, derive(meta));

    const fragment = document.createDocumentFragment();

    [
      { key: 'Model', gui: 'Camera' },
      { key: 'LensID', gui: 'Lens' },
      { key: 'FocalLength', gui: 'Focal length' }, // or FocalLength35efl
      { key: 'FNumber', gui: 'Aperture' },
      { key: 'ExposureTime', gui: 'Shutter' }, // also ExposureCompensation
      { key: 'ISO', gui: 'ISO' },
      { key: 'ExposureMode', gui: 'Mode' },
      { key: 'FocusDistance', gui: 'Focus Distance' },
      { key: 'ImageSize', gui: 'Dimensions' }, // this is sensor size, pre-crop, maybe use DefaultCropSize
      { key: 'Megapixels', gui: 'Megapixels' },
      { key: 'Orientation', gui: 'Orientation' },
      { key: 'Temperature', gui: 'Temperature' },
      { key: 'Artist', gui: 'Artist' },
      { key: 'DateTimeOriginal', gui: 'Timestamp' },
      { key: 'Z-FileSize', gui: 'Size' },
    ].filter(({ key }) => !!allMeta[key]).map(({ key, gui }) => {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode(`${gui}: ${allMeta[key]}`));

      return p;
    }).forEach(elem => fragment.appendChild(elem));

    const showFullMeta = document.createElement('button');
    showFullMeta.innerHTML = 'Show all metadata';
    showFullMeta.onclick = () => {
      events.emit('modal', { content: render(meta) });
    };

    const download = document.createElement('button');
    const name = path.basename(filepath, path.extname(filepath)) + '.jpg';
    download.innerHTML = 'Save preview image';
    download.onclick = async () => {
      try {
        await saveImage({ filepath, imageUrl, name });
      } catch (e) {
        events.emit('error', e);
      }
    };

    const rawRender = document.createElement('button');
    rawRender.innerHTML = 'Render from RAW';
    rawRender.onclick = async () => {
      const raw = await exiftool.rawRender(filepath);

      console.log(raw.slice(0, 100));

      events.emit('image:load', {
        filepath: filepath,
        imageUrl: raw,
        rotation: 0
      });
    };

    fragment.appendChild(showFullMeta);
    fragment.appendChild(download);
    fragment.appendChild(rawRender);

    elem.innerHTML = '';
    elem.appendChild(fragment);
  }

  events.on('meta:load', loadInfo);

  return { elem, style };
};
