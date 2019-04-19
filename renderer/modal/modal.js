const path = require('path');
const fs = require('fs');

const name = 'modal';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../lib/log.js')(name);
const dom = require('../tools/dom.js');

module.exports = ({ events }) => {
  const elem = dom.div(`${name} hidden`);
  const container = dom.div(`${name}-container scrollbar`);
  elem.appendChild(container);

  elem.addEventListener('click', () => {
    elem.classList.add('hidden');
  });

  container.addEventListener('click', (ev) => {
    ev.stopPropagation();
  });

  events.on('modal', ({ content = document.createDocumentFragment(), str }) => {
    dom.empty(container);

    if (str) {
      content = document.createDocumentFragment();

      str.split('\n').forEach(s => {
        const text = document.createTextNode(s);
        const p = document.createElement('p');
        p.appendChild(text);
        content.appendChild(p);
      });
    }

    container.appendChild(content);

    elem.classList.remove('hidden');
    container.scrollTop = 0;

    log.info('modal opened', content);
  });

  return { elem, style };
};
