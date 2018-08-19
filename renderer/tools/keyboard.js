const EventEmitter = require('events');

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

module.exports = keys;
