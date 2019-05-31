const name = 'modal';
const style = true;

const log = require('../../lib/log.js')(name);
const dom = require('../tools/dom.js');

module.exports = ({ events }) => {
  const elem = dom.classname(dom.div(), `${name}`, 'hidden');
  const container = dom.classname(dom.div(), `${name}-container`, 'scrollbar');
  elem.appendChild(container);

  elem.addEventListener('click', () => {
    elem.classList.add('hidden');
  });

  container.addEventListener('click', (ev) => {
    ev.stopPropagation();
  });

  events.on('modal', ({ content = document.createDocumentFragment(), str }) => {
    dom.children(
      dom.empty(container),
      str ?
        dom.fragment(...str.split('\n').map(s => dom.p(s))) :
        content
    );

    elem.classList.remove('hidden');
    container.scrollTop = 0;

    log.info('modal opened', content);
  });

  return { elem, style };
};
