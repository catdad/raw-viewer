function ratingControl(rating) {
  function star(setTo) {
    const char = setTo === 0 ? '⨯' :
      setTo <= rating ? '★' : '☆';

    const el = document.createElement('span');
    el.setAttribute('data-rate', setTo);
    el.appendChild(document.createTextNode(char));
    el.className = char;

    return el;
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

  // TODO these have to be disconnected at some point, because there's
  // about to be a bunch of them
  events.on('image:rated', ({ filepath: evpath, rating, meta }) => {
    if (evpath !== filepath) {
      return;
    }

    setMeta(meta);
    render(elem, filepath, rating, events);
  });

  render(elem, filepath, meta.rating, events);

  return elem;
};
