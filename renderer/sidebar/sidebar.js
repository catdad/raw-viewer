const path = require('path');
const fs = require('fs');

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

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  async function loadInfo({ filepath }) {
    const meta = await log.timing(
      `exif ${filepath}`,
      async () => await exiftool.readMeta(filepath)
    );

    // Canon has a lower and upper focus distance, while
    // others have a single value
    if (meta.FocusDistanceLower && meta.FocusDistanceUpper) {
      meta.FocusDistance = meta.FocusDistance ||
        `${meta.FocusDistanceLower} - ${meta.FocusDistanceUpper}`;
    }

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
      { key: 'Orientation', gui: 'Orientation' },
      { key: 'DateTimeOriginal', gui: 'Timestamp' },
      { key: 'Z-FileSize', gui: 'Size' },
    ].filter(({ key }) => !!meta[key]).map(({ key, gui }) => {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode(`${gui}: ${meta[key]}`));

      return p;
    }).forEach(elem => fragment.appendChild(elem));

    const button = document.createElement('button');
    button.innerHTML = 'Show all metadata';
    button.onclick = () => {
      events.emit('modal', { content: render(meta) });
    };

    fragment.appendChild(button);

    elem.innerHTML = '';
    elem.appendChild(fragment);
  }

  events.on('meta:load', loadInfo);

  return { elem, style };
};
