const name = 'image';
const style = true;
const log = require('../../lib/log.js')(name);

const dom = require('../tools/dom.js');
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

module.exports = ({ events }) => {
  const elem = dom.classname(dom.div(), `${name}`, 'scrollbar');
  const { dom: controlDom, load, unload, zoom } = imageControl({ name, elem, events });

  elem.appendChild(controlDom);

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

  events.on('image:load', ({ imageUrl, rotation, filepath }) => {
    log.timing(`display image ${filepath}`, async () => {
      await load({ imageUrl, rotation });
    }).then(() => {
      events.emit('meta:load', { filepath, imageUrl });
    }).catch(err => {
      events.emit('error', err);
    });
  });

  events.on('image:unload', ({ hasFilteredImages }) => {
    log.timing('unload image', async () => {
      await unload({ hasFilteredImages });
    }).then(() => {
      events.emit('meta:unload');
    }).catch(err => events.emit('error', err));
  });

  return { elem, style };
};
