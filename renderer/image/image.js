const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

let style = fs.readFileSync(path.resolve(__dirname, 'image.css'), 'utf8');

const keys = (() => {
  const SPACE = ' ';

  const ev = new EventEmitter();

  const down = {};
  const track = { [`${SPACE}`]: true, z: true };

  window.addEventListener('keydown', (e) => {
    if (track[(e.key)]) {
      down[e.key] = true;

      ev.emit('change', {
        down: Object.keys(down)
      });
    }
  });

  window.addEventListener('keyup', (e) => {
    if (track[(e.key)]) {
      delete down[e.key];

      ev.emit('change', {
        down: Object.keys(down)
      });
    }
  });

  return {
    SPACE,
    includes: (key) => !!down[key],
    count: () => Object.keys(down).length,
    on: ev.addListener.bind(ev),
    off: ev.removeListener.bind(ev)
  };
})();

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

      const targetWidth = width * scale;
      const targetHeight = height * scale;

      const transformWidth = targetWidth > box.width ?
        (targetWidth / 2) - (box.width / 2) : 0;

      const transformHeight = targetHeight > box.height ?
        (targetHeight / 2) - (box.height / 2) : 0;

      img.style.width = `${targetWidth}px`;
      img.style.height = `${targetHeight}px`;

      img.style.transform = `translate(${transformWidth}px, ${transformHeight}px)`;

      // scroll to center by default
      elem.scrollTop = (targetHeight / 2) - (box.height / 2);
      elem.scrollLeft = (targetWidth / 2) - (box.width / 2);
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
