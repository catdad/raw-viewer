const path = require('path');
const fs = require('fs');

const name = 'modal';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../lib/log.js')(name);

const div = (className) => {
  const el = document.createElement('div');
  el.className = className;

  return el;
};

module.exports = ({ events }) => {
  const elem = div(`${name} hidden`);
  const container = div(`${name}-container scrollbar`);
  elem.appendChild(container);

  events.on('modal', ({ content, str }) => {
    if (str) {
      const fragment = document.createDocumentFragment();

      str.split('\n').forEach(s => {
        const text = document.createTextNode(s);
        const p = document.createElement('p');
        p.appendChild(text);
        fragment.appendChild(p);
      });

      container.appendChild(fragment);

      elem.classList.remove('hidden');
    }

    log.info('modal opened', content);
  });

  return { elem, style };
};
