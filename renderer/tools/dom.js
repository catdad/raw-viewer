const { shell } = require('electron');

const elem = (tag) => document.createElement(tag);

const div = (className) => {
  const el = elem('div');

  if (className) {
    el.className = className;
  }

  return el;
};

const text = (str) => document.createTextNode(str);

const p = (str) => {
  const el = elem('p');

  if (str !== undefined) {
    el.appendChild(text(str));
  }

  return el;
};

const span = (str) => {
  const el = document.createElement('span');

  if (str !== undefined) {
    el.appendChild(text(str));
  }

  return el;
};

const h1 = (str) => {
  const el = document.createElement('h1');
  el.appendChild(text(str));

  return el;
};

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

const icon = name => children(
  classname(elem('i'), 'material-icons'),
  text(name)
);

const classname = (el, ...classes) => {
  classes.forEach(c => el.classList.add(c));
  return el;
};

const children = (el, ...childs) => {
  for (let child of childs) {
    el.appendChild(child);
  }

  return el;
};

const handle = (el, name, handler) => {
  el.addEventListener(name, handler, false);
  return el;
};

const click = (el, handler) => handle(el, 'click', handler);

const empty = (elem) => {
  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }
};

module.exports = {
  div,
  text,
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
