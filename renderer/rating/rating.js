// const name = 'rating';

const log = require('../../lib/log.js')('filmstrip-nav');
const keys = require('../tools/keyboard.js');

module.exports = function ({ events }) {
  let loadedFilepath = null;

  function setRating(filepath, rating) {
    log.info(`RATE ${rating} STARS for ${filepath}`);
    events.emit('toast', { text: `set to ${rating} stars` });
  }

  keys.on('change', () => {
    for (let i = 0; i <= 5; i++) {
      if (keys.includes(i)) {
        return setRating(loadedFilepath, i);
      }
    }
  });

  events.on('image:load', ({ filepath }) => {
    loadedFilepath = filepath;
  });

  return {};
};
