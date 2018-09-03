const fs = require('fs');
const path = require('path');

const keys = require('../tools/keyboard.js');

const name = 'image';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

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

  const { dom, load, zoom } = require('./image-control.js')({ name, elem });

  elem.appendChild(dom);

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

  registerMouse(elem);

  events.on('image:zoom', ({ scale }) => zoom(scale));

  events.on('image:load', ({ imageUrl, rotation }) => load({ imageUrl, rotation }));

  events.on('image:load', ({ filepath }) => {
    events.emit('meta:load', {
      filepath: filepath
    });
  });

  return { elem, style };
};
