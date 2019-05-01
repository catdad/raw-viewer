const fs = require('fs');
const path = require('path');

const name = 'image';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');
const log = require('../../lib/log.js')(name);

const keys = require('../tools/keyboard.js');
const imageControl = require('./image-control.js');

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
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    x = y = null;

    return false;
  };

  const onMouseDown = (e) => {
    e.preventDefault();

    x = e.x;
    y = e.y;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return false;
  };

  elem.addEventListener('mousedown', onMouseDown);
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = `${name} scrollbar`;

  const { dom, load, zoom } = imageControl({ name, elem });

  elem.appendChild(dom);

  keys.on('change', () => {
    if (keys.includes(keys.ALT) && keys.includes('z')) {
      return elem.style.cursor = 'zoom-out';
    }

    if (keys.includes('z')) {
      return elem.style.cursor = 'zoom-in';
    }

    return elem.style.cursor = '-webkit-grab';
  });

  registerMouse(elem);

  events.on('image:zoom', ({ scale }) => zoom(scale, { forceCenter: true }));

  events.on('image:load', async ({ imageUrl, rotation, filepath }) => {
    await log.timing(`display image ${filepath}`, async () => {
      await load({ imageUrl, rotation });
    });
  });

  events.on('image:load', ({ imageUrl, filepath }) => {
    events.emit('meta:load', { filepath, imageUrl });
  });

  return { elem, style };
};
