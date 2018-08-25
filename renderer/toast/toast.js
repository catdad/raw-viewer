const fs = require('fs');
const path = require('path');

const name = 'toast';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function createMsg({ text, type, title = null }) {
  const div = document.createElement('div');
  div.className = `toast-msg toast-${type}`;

  if (title) {
    const titleElem = document.createElement('div');
    titleElem.className = 'toast-title';

    titleElem.appendChild(document.createTextNode(title));
    div.appendChild(titleElem);
  }

  div.appendChild(document.createTextNode(text.toString()));

  return div;
}

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  function removeToast(msg) {
    msg.classList.remove('toast-show');

    setTimeout(() => {
      elem.removeChild(msg);
    }, 700);
  }

  function showToast({ title, text, type }) {
    const msg = createMsg({ title, text, type });
    elem.appendChild(msg);

    setTimeout(() => {
      msg.classList.add('toast-show');
    }, 0);

    setTimeout(() => {
      removeToast(msg);
    }, 5000);
  }

  events.on('toast', showToast);

  events.on('toast:error', (args) => showToast(Object.assign({}, args, { type: 'error' })));

  return { elem, style };
};
