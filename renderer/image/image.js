const fs = require('fs');
const path = require('path');

const keys = require('../tools/keyboard.js');
const imageControl = require('./image-control.js');

const name = 'image';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function registerMouse(elem) {
  let x, y;

  const onMouseMove = (e) => {
    if (keys.includes('z')) {
      // TODO see #19
      // implement drag-based zoom
    }

    // panning by default
    elem.scrollLeft += x - e.x;
    elem.scrollTop += y - e.y;

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

    elem.addEventListener('mousemove', onMouseMove);
    elem.addEventListener('mouseup', onMouseUp);

    return false;
  };

  elem.addEventListener('mousedown', onMouseDown);
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const { dom, load, zoom } = imageControl({ name, elem });

  elem.appendChild(dom);

  keys.on('change', ({ down }) => {
    if (down.includes(keys.ALT) && down.includes('z')) {
      return elem.style.cursor = 'zoom-out';
    }

    if (down.includes('z')) {
      return elem.style.cursor = 'zoom-in';
    }

    return elem.style.cursor = '-webkit-grab';
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
