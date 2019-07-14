const name = 'main';
const log = require('../../lib/log.js')(name);
const startup = log.timer('startup');

const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('events');
const ipc = require('electron').ipcRenderer;
const { throttle } = require('lodash');

const dom = require('../tools/dom.js');
const config = require('../../lib/config.js');
const analytics = require('../../lib/analytics.js');
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
  dom.children(
    document.head,
    dom.props(dom.elem('link'), {
      rel: 'stylesheet',
      type: 'text/css',
      href: csspath
    })
  );
}

function applyStyle(css) {
  dom.children(
    document.head,
    dom.children(
      dom.props(dom.elem('style'), { type: 'text/css' }),
      dom.text(css)
    )
  );
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
  elem.classList.add(process.platform);

  if (opts.experiments.framelessWindow) {
    elem.classList.add('frameless');
  }

  render('frame', elem, opts);
  render('directory', elem, opts);
  render('rating', elem, opts);
  render('filmstrip', elem, opts);
  render('sidebar', elem, opts);
  render('controls', elem, opts);
  render('image', elem, opts);
  render('about', elem, opts);
  render('shortcuts', elem, opts);
  render('updater', elem, opts);
  render('dropzone', elem, opts);
  render('toast', elem, opts);
  render('modal', elem, opts);
}

async function start(elem) {
  const [lastDirectory, filmstripOnLeft, framelessWindow] = await config.getProp([
    'client.lastDirectory',
    'experiments.filmstripOnLeft',
    'experiments.framelessWindow'
  ]);

  const appOpts = {
    experiments: { filmstripOnLeft, framelessWindow },
    client: { lastDirectory }
  };

  renderApp(elem, appOpts);

  if (filmstripOnLeft) {
    elem.classList.add('experiment-filmstrip-left');
  }

  events.on('error', (err) => {
    log.error('caught error', err);
    events.emit('toast:error', {
      title: 'App Error:',
      text: err.toString()
    });
  });

  events.on('modal:closed', () => {
    analytics.screenview('main');
  });
  analytics.screenview('main');

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

module.exports = (elem) => {
  start(elem).then(() => {
    startup.done();
    log.info('initialized');
  }).catch(err => {
    events.emit('error', err);
  });
};
