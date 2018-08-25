const fs = require('fs');
const path = require('path');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function button({ onclick, text, className = '' }) {
  const el = document.createElement('button');
  el.className = className;
  el.appendChild(document.createTextNode(text));
  el.addEventListener('click', onclick);

  return el;
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

  elem.appendChild(oneToOne);
  elem.appendChild(fit);

  return { elem, style };
};
