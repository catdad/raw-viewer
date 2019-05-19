const name = 'main';
const log = require('../../lib/log.js')(name);
const startup = log.timer('startup');

const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('events');
const ipc = require('electron').ipcRenderer;
const { throttle } = require('lodash');

const config = require('../../lib/config.js');
const stylepath = path.resolve(__dirname, `${name}.css`);

const events = new EventEmitter();
// allow infinite amount of listeners, since this
// will be used quite a lot
events.setMaxListeners(0);
events.off = events.removeListener;

ipc.on('ipcevent', (ev, { name, data }) => {
  events.emit(name, data);
});

function linkStyle(csspath) {
  const elem = document.createElement('link');
  elem.setAttribute('rel', 'stylesheet');
  elem.setAttribute('type', 'text/css');
  elem.setAttribute('href', csspath);

  document.head.appendChild(elem);
}

function applyStyle(css) {
  var elem = document.createElement('style');
  elem.type = 'text/css';

  elem.appendChild(document.createTextNode(css));
  document.head.appendChild(elem);
}

function render(name, parentElem) {
  const modname = path.resolve(__dirname, '..', name, `${name}`);
  const mod = require(`${modname}.js`)({ events });

  if (mod.style === true) {
    linkStyle(`${modname}.css`);
  } else if (mod.style) {
    applyStyle(mod.style);
  }

  if (mod.elem) {
    parentElem.appendChild(mod.elem);
  }
}

async function initialize(elem) {
  const experiments = await config.getProp('experiments');

  if (experiments.filmstripOnLeft) {
    elem.classList.add('experiment-filmstrip-left');
  }

  const lastDirectory = await config.getProp('client.lastDirectory');

  if (!lastDirectory) {
    return;
  }

  try {
    const stat = await fs.stat(lastDirectory);

    if (stat.isDirectory()) {
      events.emit('directory:load', { dir: lastDirectory });
    } else {
      throw new Error(`"${lastDirectory}" is not a directory`);
    }
  } catch (e) {
    log.error(e);
    events.emit('error', new Error(`could not open "${lastDirectory}"`));
  }
}

module.exports = function (elem) {
  linkStyle(stylepath);

  elem.classList.add(name);

  render('directory', elem);
  render('rating', elem);
  render('filmstrip', elem);
  render('sidebar', elem);
  render('controls', elem);
  render('image', elem);
  render('about', elem);
  render('updater', elem);
  render('dropzone', elem);
  render('toast', elem);
  render('modal', elem);

  events.on('error', (err) => {
    events.emit('toast:error', {
      title: 'App Error:',
      text: err.toString()
    });
  });

  window.addEventListener('resize', throttle(() => {
    events.emit('window:resize');
  }, 50));

  initialize(elem).then(() => {
    startup.done();
    log.info('initialized');
  }).catch(err => {
    events.emit('error', err);
  });
};
