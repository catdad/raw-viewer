const { shell } = require('electron');

const handle = (el, name, handler) => {
  el.addEventListener(name, handler, false);
  return el;
};

const click = (el, handler) => handle(el, 'click', handler);

const classname = (el, ...classes) => {
  classes.forEach(c => c && el.classList.add(c));
  return el;
};

const children = (el, ...childs) => {
  for (let child of childs) {
    el.appendChild(child);
  }

  return el;
};

const empty = (elem) => {
  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }
};

const elem = (tag) => document.createElement(tag);

const text = (str) => document.createTextNode(str);

const div = (className) => classname(elem('div'), className);

const p = (str) => {
  const el = elem('p');

  if (str !== undefined) {
    el.appendChild(text(str));
  }

  return el;
};

const span = (str) => children(elem('span'), text(str || ''));

const h1 = (str) => children(elem('h1'), text(str));

const link = (str, href) => {
  const a = children(
    click(elem('a'), (ev) => {
      ev.preventDefault();
      shell.openExternal(href);
    }),
    text(str)
  );
  a.href = href;

  return a;
};

const linkBlock = (className, str, href) => children(div(className), link(str, href));

const button = (str, onClick) => click(children(elem('button'), text(str)), onClick);

const icon = name => children(classname(elem('i'), 'material-icons'), text(name));

module.exports = {
  text,
  div,
  p,
  span,
  h1,
  link,
  linkBlock,
  button,
  icon,
  classname,
  children,
  handle,
  click,
  empty
};
