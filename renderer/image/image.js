const fs = require('fs');
const path = require('path');

const { imageElem } = require('../util.js');

let style = fs.readFileSync(path.resolve(__dirname, 'image.css'), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = 'image';

  function loadImage({ filepath, imageUrl }) {
    var img = document.createElement('img');
    img.src = imageUrl;

    elem.innerHTML = '';
    elem.appendChild(img);
  }

  events.on('load:image', loadImage);

  return { elem, style };
};
