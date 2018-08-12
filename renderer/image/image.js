const fs = require('fs');
const path = require('path');

let style = fs.readFileSync(path.resolve(__dirname, 'image.css'), 'utf8');

const scales = [1, 0.8, 0.6, 0.4, 0.2];

module.exports = function ({ events }) {
  let elem = document.createElement('div');
  elem.className = 'image';

  function loadImage({ imageUrl }) {
    let scale = 1;
    let img = document.createElement('img');
    img.src = imageUrl;

    elem.innerHTML = '';
    elem.appendChild(img);

    let box = elem.getBoundingClientRect();

    let width = img.width;
    let height = img.height;

    function zoom(toScale) {
      // JavaScript math sucks
      scale = Number(toScale.toFixed(1));

      console.log('zoom to', scale);

      img.style.width = `${width * scale}px`;
      img.style.height = `${height * scale}px`;

      // scroll to center by default
      elem.scrollTop = (height * scale / 2) - (box.height / 2);
      elem.scrollLeft = (width * scale / 2) - (box.width / 2);
    }

    img.onload = function () {
      width = img.naturalWidth;
      height = img.naturalHeight;

      zoom(1);
    };

    elem.onclick = function (ev) {
      if (ev.ctrlKey && scale > 0.1) {
        scale -= 0.1;
        zoom(scale);
      } else if (ev.shiftKey && scale < 1) {
        scale += 0.1;
        zoom(scale);
      }
    };
  }

  events.on('load:image', loadImage);

  return { elem, style };
};
