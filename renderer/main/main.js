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

function render(name, parentElem, opts) {
  const modname = path.resolve(__dirname, '..', name, `${name}`);
  const mod = require(`${modname}.js`)({ events }, opts);

  if (mod.style === true) {
    linkStyle(`${modname}.css`);
  } else if (mod.style) {
    applyStyle(mod.style);
  }

  if (mod.elem) {
    parentElem.appendChild(mod.elem);
  }
}

function renderApp(elem, opts) {
  linkStyle(stylepath);
  elem.classList.add(name);

  render('frame', elem, opts);
  render('directory', elem, opts);
  render('rating', elem, opts);
  render('filmstrip', elem, opts);
  render('sidebar', elem, opts);
  render('controls', elem, opts);
  render('image', elem, opts);
  render('about', elem, opts);
  render('updater', elem, opts);
  render('dropzone', elem, opts);
  render('toast', elem, opts);
  render('modal', elem, opts);
}

async function start(elem) {
  const [lastDirectory, filmstripOnLeft] = await config.getProp([
    'client.lastDirectory',
    'experiments.filmstripOnLeft'
  ]);

  const appOpts = {
    experiments: { filmstripOnLeft },
    client: { lastDirectory }
  };

  renderApp(elem, appOpts);

  if (filmstripOnLeft) {
    elem.classList.add('experiment-filmstrip-left');
  }

  events.on('error', (err) => {
    events.emit('toast:error', {
      title: 'App Error:',
      text: err.toString()
    });
  });

  if (lastDirectory) {
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

  window.addEventListener('resize', throttle(() => {
    events.emit('window:resize');
  }, 50));
}

module.exports = function (elem) {
  start(elem).then(() => {
    startup.done();
    log.info('initialized');
  }).catch(err => {
    events.emit('error', err);
  });
};
