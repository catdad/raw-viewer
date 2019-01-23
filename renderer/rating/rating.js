const name = 'rating';
const exiftool = require('../tools/exiftool-child.js');
const log = require('../../lib/log.js')(name);
const keys = require('../tools/keyboard.js');

module.exports = function ({ events }) {
  let loadedFilepath = null;

  function setRating(filepath, rating, toast = false) {
    log.info(`RATE ${rating} STARS for ${filepath}`);

    log.time(`rating ${filepath}`);

    exiftool.setRating(filepath, rating).then((meta) => {
      log.timeEnd(`rating ${filepath}`);

      events.emit('image:rated', { filepath, rating, meta });

      if (toast) {
        events.emit('toast', { text: `set to ${rating} stars` });
      }
    }).catch((err) => {
      log.timeEnd(`rating ${filepath}`);

      log.error(err);
      events.emit('error', err);
    });
  }

  keys.on('change', () => {
    for (let i = 0; i <= 5; i++) {
      if (keys.includes(i)) {
        return setRating(loadedFilepath, i, true);
      }
    }
  });

  events.on('image:rate', ({ filepath, rating }) => {
    setRating(filepath, rating);
  });

  events.on('image:load', ({ filepath }) => {
    loadedFilepath = filepath;
  });

  return {};
};
