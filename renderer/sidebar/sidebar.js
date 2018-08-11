const path = require('path');
const fs = require('fs');

const name = 'sidebar';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const { imageMeta } = require('../util.js');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  async function loadInfo({ filepath }) {
    const meta = await imageMeta(filepath);

    const fragment = document.createDocumentFragment();

    Object.keys(meta).filter(key => {
      return [
        'Timestamp',
        'Camera',
        'ISO speed',
        'Shutter',
        'Aperture',
        'Focal length',
        'Thumb size'
      ].includes(key);
    }).map(key => {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode(`${key}: ${meta[key]}`));

      return p;
    }).forEach(elem => fragment.appendChild(elem));

    elem.innerHTML = '';
    elem.appendChild(fragment);
  }

  events.on('load:meta', loadInfo);

  return { elem, style };
};
