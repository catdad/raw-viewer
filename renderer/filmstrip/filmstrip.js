const fs = require('fs-extra');
const path = require('path');

const { imageElem } = require('../util.js');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  async function loadThumbnails(dir) {
    console.log('reading', dir);
    var files = await fs.readdir(dir);

    var fragment = document.createDocumentFragment();

    for (let file of files) {
      fragment.appendChild(imageElem(path.resolve(dir, file)));
    }

    elem.innerHTML = '';
    elem.appendChild(fragment);
  }

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
