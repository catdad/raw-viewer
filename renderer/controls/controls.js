const fs = require('fs');
const path = require('path');

const toggle = require('./toggle.js');
const select = require('./select.js');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');
let curentRating = 0;

//  function button({ onclick, text, className = '' }) {
//    const el = document.createElement('button');
//    el.className = className;
//    el.appendChild(document.createTextNode(text));
//    el.addEventListener('click', onclick);
//
//    return el;
//  }

function stars({ onclick, className = '' }) {
  const parent = document.createElement('span');
  parent.className = className;

  function setFilter({ rating }) {
    curentRating = rating;
    onclick({ rating });

    spans.forEach((span, idx) => {
      if (idx === 0) {
        return;
      }

      span.innerText = idx <= curentRating ? '★' : '☆';
    });
  }

  const spans = [0, 1, 2, 3, 4, 5].map((rating) => {
    const char = rating === 0 ? '⨯' :
      rating <= curentRating ? '★' : '☆';

    const el = document.createElement('span');
    el.onclick = () => {
      setFilter({ rating });
    };
    el.appendChild(document.createTextNode(char));

    parent.appendChild(el);

    return el;
  });

  return parent;
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const zoom = toggle({
    name: 'zoom',
    values: [ 'fit', '1:1' ]
  });

  zoom.on('change', ({ value }) => {
    events.emit('image:zoom', { scale: value === '1:1' ? 1 : 'fit' });
  });

  const ratings = select({
    name: 'rating',
    values: [
      '★ 0+',
      '★ 1+',
      '★ 2+',
      '★ 3+',
      '★ 4+',
      '★ 5',
    ]
  });

  elem.appendChild(zoom.elem);
  elem.appendChild(ratings.elem);

//  const ratings = stars({
//    onclick: ({ rating }) => {
//      events.emit('image:filter', { rating });
//    },
//    className: 'filter-rating'
//  });
//
//  elem.appendChild(ratings);

  return { elem, style };
};
