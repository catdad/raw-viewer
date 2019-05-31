const name = 'toast';
const style = true;

const dom = require('../tools/dom.js');

function createMsg({ text, type, title = null }) {
  return dom.children(
    dom.classname(dom.div(), `${name}-msg`, `${name}-${type}`),
    title ?
      dom.children(
        dom.div(`${name}-title`),
        dom.text(title)
      ) :
      dom.text(''),
    dom.text(text.toString())
  );
}

module.exports = ({ events }) => {
  const elem = dom.div(name);

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
  events.on('toast:success', (args) => showToast(Object.assign({}, args, { type: 'success' })));
  events.on('toast:error', (args) => showToast(Object.assign({}, args, { type: 'error' })));

  return { elem, style };
};
