const log = require('../../lib/log.js')('filmstrip-rating');
const exiftool = require('../tools/exiftool-child.js');

function ratingControl(rating) {
  function star(setTo) {
    const char = setTo === 0 ? '⨯' :
      setTo <= rating ? '★' : '☆';

    const el = document.createElement('span');
    el.setAttribute('data-rate', setTo);
    el.appendChild(document.createTextNode(char));

    return el;
  }

  return Array.apply(null, new Array(6)).map((n, i) => {
    return star(i);
  });
}

async function setRating(filepath, rating) {
  return await exiftool.setRating(filepath, rating);
}

function render(elem, filepath, rating, events, setMeta) {
  elem.innerHTML = '';

  const fragment = document.createDocumentFragment();

  ratingControl(rating).forEach((el, idx) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      setRating(filepath, idx).then(data => {
        setMeta(data);
        render(elem, filepath, idx, events, setMeta);
      }).catch(err => {
        log.error(err);
        events.emit('error', err);
      });
    });

    fragment.appendChild(el);
  });

  elem.appendChild(fragment);
}

module.exports = function ({ filepath, meta, events, setMeta }) {
  const elem = document.createElement('div');
  elem.className = 'rating';
  elem.setAttribute('data-rating', meta.rating);

  render(elem, filepath, meta.rating, events, setMeta);

  return elem;
};
