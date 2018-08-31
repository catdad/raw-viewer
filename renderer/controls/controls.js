const fs = require('fs');
const path = require('path');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');
let curentRating = 0;

function button({ onclick, text, className = '' }) {
  const el = document.createElement('button');
  el.className = className;
  el.appendChild(document.createTextNode(text));
  el.addEventListener('click', onclick);

  return el;
}

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

  const oneToOne = button({
    onclick: () => {
      events.emit('image:zoom', { scale: 1 });
    },
    text: '1:1'
  });

  const fit = button({
    onclick: () => {
      events.emit('image:zoom', { scale: 'fit' });
    },
    text:' fit'
  });

  const ratings = stars({
    onclick: ({ rating }) => {
      events.emit('image:filter', { rating });
    },
    className: 'filter-rating'
  });

  elem.appendChild(oneToOne);
  elem.appendChild(fit);
  elem.appendChild(ratings);

  return { elem, style };
};
