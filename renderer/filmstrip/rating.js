const dom = require('../tools/dom.js');

function ratingControl(rating) {
  function star(setTo) {
    const name = setTo === 0 ? 'close' :
      setTo <= rating ? 'star' : 'star_border';

    return dom.props(
      dom.classname(dom.icon(name), name),
      { 'data-rate': setTo }
    );
  }

  return Array.apply(null, new Array(6)).map((n, i) => {
    return star(i);
  });
}

function render(elem, filepath, rating, events) {
  dom.children(
    dom.empty(elem),
    dom.fragment(...ratingControl(rating).map((el, idx) => {
      return dom.click(el, (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        events.emit('image:rate', { filepath, rating: idx });
      });
    }))
  );
}

module.exports = ({ filepath, meta, events, setMeta }) => {
  const elem = dom.props(dom.div('rating'), {
    'data-rating': meta.rating
  });

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
