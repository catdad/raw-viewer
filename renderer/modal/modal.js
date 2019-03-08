const path = require('path');
const fs = require('fs');

const name = 'modal';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../lib/log.js')(name);

module.exports = ({ events }) => {
  const elem = document.createElement('div');
  elem.className = name;
  elem.classList.add('hidden');

  const container = document.createElement('div');
  container.className = `${name}-container`;

  elem.appendChild(container);

  events.on('modal', ({ content }) => {
    log.info('modal opened', content);
  });

  return { elem, style };
};
