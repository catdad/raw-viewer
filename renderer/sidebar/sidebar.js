const path = require('path');
const fs = require('fs');

const name = 'sidebar';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const exiftool = require('../exiftool-child.js');
const log = require('../../tools/log.js')(name);

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  async function loadInfo({ filepath }) {
    log.time('client exif');
    const exif = await exiftool.readExif(filepath);
    log.timeEnd('client exif');

    const meta = exif.data[0];

    const fragment = document.createDocumentFragment();

    [
      { key: 'Model', gui: 'Camera' },
      { key: 'LensID', gui: 'Lens' },
      { key: 'FocalLength', gui: 'Focal length' }, // or FocalLength35efl
      { key: 'FNumber', gui: 'Aperture' },
      { key: 'ExposureTime', gui: 'Shutter' }, // also ExposureCompensation
      { key: 'ISO', gui: 'ISO' },
      { key: 'ImageSize', gui: 'Dimensions' }, // this is sensor size, pre-crop, maybe use DefaultCropSize
      { key: 'DateTimeOriginal', gui: 'Timestamp' },
      { key: 'Z-FileSize', gui: 'Size' },
    ].filter(({ key }) => !!meta[key]).map(({ key, gui }) => {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode(`${gui}: ${meta[key]}`));

      return p;
    }).forEach(elem => fragment.appendChild(elem));

    elem.innerHTML = '';
    elem.appendChild(fragment);
  }

  events.on('load:meta', loadInfo);

  return { elem, style };
};
