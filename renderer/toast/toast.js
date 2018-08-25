const fs = require('fs');
const path = require('path');

const name = 'toast';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function createMsg({ text, type }) {
  const div = document.createElement('div');
  div.className = `toast-msg toast-${type}`;

  div.appendChild(document.createTextNode(text.toString()));

  return div;
}

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  function onToast({ title, text, type }) {
    const msg = createMsg({ title, text, type });
    elem.appendChild(msg);

    setTimeout(() => {
      msg.classList.add('toast-show');
    }, 0);

    setTimeout(() => {
//      elem.removeChild(msg);
    }, 5000);
  }

  events.on('toast', onToast);

  events.on('toast:error', (args => onToast(Object.assign({}, args, { type: 'error' }))));

  return { elem, style };
};
