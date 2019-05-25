const dom = require('../tools/dom.js');

function ratingControl(rating) {
  function star(setTo) {
    const name = setTo === 0 ? 'close' :
      setTo <= rating ? 'star' : 'star_border';

    const icon = dom.icon(name);
    icon.setAttribute('data-rate', setTo);
    icon.classList.add(name);

    return icon;
  }

  return Array.apply(null, new Array(6)).map((n, i) => {
    return star(i);
  });
}

function render(elem, filepath, rating, events) {
  elem.innerHTML = '';

  const fragment = document.createDocumentFragment();

  ratingControl(rating).forEach((el, idx) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      events.emit('image:rate', { filepath, rating: idx });
    });

    fragment.appendChild(el);
  });

  elem.appendChild(fragment);
}

module.exports = function ({ filepath, meta, events, setMeta }) {
  const elem = document.createElement('div');
  elem.className = 'rating';
  elem.setAttribute('data-rating', meta.rating);

  const onRated = ({ filepath: evpath, rating, meta }) => {
    if (evpath !== filepath) {
      return;
    }

    setMeta(meta);
    render(elem, filepath, rating, events);
  };

  events.on('image:rated', onRated);

  events.once('directory:load', () => {
    events.off('image:rated', onRated);
  });

  render(elem, filepath, meta.rating, events);

  return elem;
};
