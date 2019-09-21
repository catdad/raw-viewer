const EventEmitter = require('events');

const keys = (() => {
  const SPACE = ' ';
  const ALT = 'alt';
  const CTRL = 'control';
  const SHIFT = 'shift';
  const UP = 'arrowup';
  const DOWN = 'arrowdown';
  const LEFT = 'arrowleft';
  const RIGHT = 'arrowright';
  const DELETE = 'delete';
  const BACKSPACE = 'backspace';
  const HOME = 'home';
  const END = 'end';

  const events = new EventEmitter();

  const down = {};
  const track = {
    [`${SPACE}`]: true,
    [`${ALT}`]: true,
    [`${CTRL}`]: true,
    [`${SHIFT}`]: true,
    [`${UP}`]: true,
    [`${DOWN}`]: true,
    [`${LEFT}`]: true,
    [`${RIGHT}`]: true,
    [`${DELETE}`]: true,
    [`${BACKSPACE}`]: true,
    [`${HOME}`]: true,
    [`${END}`]: true,
    z: true,
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true
  };

  window.addEventListener('keydown', (e) => {
    let stopped = false;

    const key = e.key.toLowerCase();

    if (down[key]) {
      return;
    }

    if (track[(key)]) {
      down[key] = true;

      events.emit('change', {
        stop: () => {
          stopped = true;
          e.preventDefault();
        },
        down: Object.keys(down)
      });
    }

    if (stopped) {
      return false;
    }
  }, false);

  window.addEventListener('keyup', (e) => {
    let stopped = false;

    const key = e.key.toLowerCase();

    if (track[(key)]) {
      delete down[key];

      events.emit('change', {
        stop: () => {
          stopped = true;
          e.preventDefault();
        },
        down: Object.keys(down)
      });
    }

    if (stopped) {
      return false;
    }
  }, false);

  return Object.defineProperties({
    SPACE,
    ALT,
    CTRL,
    SHIFT,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    DELETE,
    BACKSPACE,
    HOME,
    END,
    includes: (key) => !!down[key.toString()],
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
