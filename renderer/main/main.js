const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('events');
const ipc = require('electron').ipcRenderer;

const name = 'main';
const config = require('../../lib/config.js');
const log = require('../../lib/log.js')(name);
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const events = new EventEmitter();
// allow infinite amount of listeners, since this
// will be used quite a lot
events.setMaxListeners(0);
events.off = events.removeListener;

ipc.on('ipcevent', (ev, { name, data }) => {
  events.emit(name, data);
});

function applyStyle(css) {
  var elem = document.createElement('style');
  elem.type = 'text/css';

  elem.appendChild(document.createTextNode(css));
  document.head.appendChild(elem);
}

function render(name, parentElem) {
  const mod = require(path.resolve(__dirname, '..', name, `${name}.js`))({ events });

  if (mod.style) {
    applyStyle(mod.style);
  }

  if (mod.elem) {
    parentElem.appendChild(mod.elem);
  }
}

async function initialize() {
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
  applyStyle(style);

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

  initialize().then(() => {
    log.info('initialized');
  }).catch(err => {
    events.emit('error', err);
  });
};
