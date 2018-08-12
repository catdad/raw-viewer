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
    e.preventDefault();

    if (track[(e.key)]) {
      down[e.key] = true;

      ev.emit('change', {
        down: Object.keys(down)
      });
    }

    return false;
  });

  window.addEventListener('keyup', (e) => {
    e.preventDefault();

    if (track[(e.key)]) {
      delete down[e.key];

      ev.emit('change', {
        down: Object.keys(down)
      });
    }

    return false;
  });

  return {
    SPACE,
    includes: (key) => !!down[key],
    count: () => Object.keys(down).length,
    on: ev.addListener.bind(ev),
    off: ev.removeListener.bind(ev)
  };
})();

function registerMouse(elem) {
  let x, y;

  const onMouseMove = (e) => {
    // TODO don't do this on every single move
    if (keys.includes(keys.SPACE)) {
      // panning
      elem.scrollLeft += x - e.x;
      elem.scrollTop += y - e.y;
    }

    x = e.x;
    y = e.y;

    return false;
  };

  const onMouseUp = () => {
    elem.removeEventListener('mousemove', onMouseMove);
    elem.removeEventListener('mouseup', onMouseUp);

    x = y = null;

    return false;
  };

  const onMouseDown = (e) => {
    e.preventDefault();

    x = e.x;
    y = e.y;

    if (keys.includes(keys.SPACE)) {
      // panning
      elem.addEventListener('mousemove', onMouseMove);
      elem.addEventListener('mouseup', onMouseUp);
    }

    return false;
  };

  elem.addEventListener('mousedown', onMouseDown);
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = 'image';

  const img = document.createElement('img');
  elem.appendChild(img);

  let box = elem.getBoundingClientRect();

  window.addEventListener('resize', () => {
    // TODO don't do this on every single event
    box = elem.getBoundingClientRect();
  });

  function loadImage({ imageUrl }) {
    let scale = 1;
    let width = img.width;
    let height = img.height;

    box = elem.getBoundingClientRect();

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

    img.src = imageUrl;
  }

  registerMouse(elem);

  events.on('load:image', loadImage);

  return { elem, style };
};
