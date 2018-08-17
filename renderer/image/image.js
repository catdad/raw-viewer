const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const log = require('../../tools/log.js')('image');

const name = 'image';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const keys = (() => {
  const SPACE = ' ';
  const ALT = 'alt';
  const CTRL = 'control';
  const SHIFT = 'shift';

  const events = new EventEmitter();

  const down = {};
  const track = {
    [`${SPACE}`]: true,
    [`${ALT}`]: true,
    [`${CTRL}`]: true,
    [`${SHIFT}`]: true,
    z: true
  };

  window.addEventListener('keydown', (e) => {
    e.preventDefault();

    const key = e.key.toLowerCase();

    if (down[key]) {
      return false;
    }

    if (track[(key)]) {
      down[key] = true;

      events.emit('change', {
        down: Object.keys(down)
      });
    }

    return false;
  });

  window.addEventListener('keyup', (e) => {
    e.preventDefault();

    const key = e.key.toLowerCase();

    if (track[(key)]) {
      delete down[key];

      events.emit('change', {
        down: Object.keys(down)
      });
    }

    return false;
  });

  return Object.defineProperties({
    SPACE,
    ALT,
    CTRL,
    SHIFT,
    includes: (key) => !!down[key],
    on: events.addListener.bind(events),
    off: events.removeListener.bind(events)
  }, {
    count: {
      configurable: false,
      get: () => Object.keys(down).length
    },
    list: {
      configurable: false,
      get: () => Object.keys(down)
    }
  });
})();

function registerMouse(elem) {
  let x, y;

  const onMouseMove = (e) => {
    // TODO don't do this on every single move
    if (keys.includes(keys.SPACE)) {
      // panning
      elem.scrollLeft += x - e.x;
      elem.scrollTop += y - e.y;
    } else if (keys.includes('z')) {
      // TODO see #19
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

    // panning
    const start = keys.includes(keys.SPACE) ||
      // zooming
      keys.includes('z');

    if (start) {
      elem.addEventListener('mousemove', onMouseMove);
      elem.addEventListener('mouseup', onMouseUp);
    }

    return false;
  };

  elem.addEventListener('mousedown', onMouseDown);
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const container = document.createElement('div');
  container.className = `${name}-container`;

  const img = document.createElement('img');

  container.appendChild(img);
  elem.appendChild(container);

  let box;

  function refreshBox() {
    const rect = elem.getBoundingClientRect();

    box = {
      width: rect.width - 20,
      height: rect.height - 20
    };
  }

  refreshBox();

  window.addEventListener('resize', () => {
    // TODO don't do this on every single event
    refreshBox();
  });

  keys.on('change', ({ down }) => {
    if (down.includes(keys.SPACE)) {
      return elem.style.cursor = '-webkit-grab';
    }

    if (down.includes(keys.ALT) && down.includes('z')) {
      return elem.style.cursor = 'zoom-out';
    }

    if (down.includes('z')) {
      return elem.style.cursor = 'zoom-in';
    }

    return elem.style.cursor = 'auto';
  });

  function loadImage({ imageUrl, rotation }) {
    let scale = 1;
    let width = img.width;
    let height = img.height;
    const rotate = rotation === 0 ? '' : `rotate(${rotation}deg)`;
    const isRotated = rotation === 90 || rotation === 270;

    refreshBox();

    function int(num) {
      return Math.floor(num);
    }

    function evenInt(num) {
      const i = int(num);

      return i % 2 ? i - 1 : i;
    }

    function zoom(toScale) {
      // JavaScript math sucks
      scale = Math.min(Number(toScale.toFixed(2)), 1);

      log.info('zoom to', scale);

      const targetWidth = evenInt(width * scale);
      const targetHeight = evenInt(height * scale);

      const transformWidth = targetWidth > box.width ?
        int((targetWidth / 2) - (box.width / 2)) : 0;

      const transformHeight = targetHeight > box.height ?
        int((targetHeight / 2) - (box.height / 2)) : 0;

      if (isRotated) {
        img.style.width = `${targetHeight}px`;
        img.style.height = `${targetWidth}px`;
        img.style.transform = rotate;
      }  else {
        img.style.width = `${targetWidth}px`;
        img.style.height = `${targetHeight}px`;
      }

      container.style.width = `${targetWidth}px`;
      container.style.height = `${targetHeight}px`;
      container.style.transform = `translate(${transformWidth}px, ${transformHeight}px)`;

      // scroll to center by default
      elem.scrollTop = (targetHeight / 2) - (box.height / 2);
      elem.scrollLeft = (targetWidth / 2) - (box.width / 2);
    }

    function zoomToBestFit() {
      const scale = Math.min(
        box.width / width,
        box.height / height
      );

      zoom(scale);
    }

    img.onload = function () {
      if (isRotated) {
        width = img.naturalHeight;
        height = img.naturalWidth;
      } else {
        width = img.naturalWidth;
        height = img.naturalHeight;
      }

      zoomToBestFit();
    };

    elem.onclick = function () {
      const zout = keys.includes(keys.ALT) && keys.includes('z');
      const zin = keys.includes('z') && !zout;

      if (scale > 0.1 && zout) {
        // zooming out
        scale -= 0.1;
        zoom(scale);
      } else if (scale < 1 && zin) {
        // zooming in
        scale += 0.1;
        zoom(scale);
      }
    };

    img.style.transform = '';
    img.src = imageUrl;
  }

  registerMouse(elem);

  events.on('load:image', loadImage);

  return { elem, style };
};
