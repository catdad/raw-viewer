const { BrowserWindow } = require('electron').remote;

const name = 'frame';
const style = true;

const log = require('../../lib/log.js')(name);
const menu = require('../../lib/menu.js');
const dom = require('../tools/dom.js');

const defaultFrame = () => {
  let menuOpen = false;
  let menuTimer;

  const throttledClose = () => {
    if (menuTimer) {
      clearTimeout(menuTimer);
    }

    menuTimer = setTimeout(() => {
      menuOpen = false;
    }, 100);
  };

  return dom.children(
    dom.div(name),
    dom.click(
      dom.classname(dom.icon('close'), 'right', 'close'),
      () => {
        BrowserWindow.getFocusedWindow().close();
      }
    ),
    dom.click(
      dom.classname(dom.icon('filter_none'), 'right', 'icon-rotate-180'),
      () => {
        const browser = BrowserWindow.getFocusedWindow();

        if (browser.isMaximized()) {
          browser.unmaximize();
        } else {
          browser.maximize();
        }
      }
    ),
    dom.click(
      dom.classname(dom.icon('minimize'), 'right'),
      () => {
        BrowserWindow.getFocusedWindow().minimize();
      }
    ),
    dom.click(
      dom.classname(dom.icon('menu'), 'left'),
      (e) => {
        if (menuTimer) {
          clearTimeout(menuTimer);
        }

        const rect = e.target.getBoundingClientRect();

        menu[menuOpen ? 'closeContext' : 'openContext']({
          x: rect.left,
          y: rect.bottom
        }).then(() => {
          throttledClose();
          log.info('frameless app menu action complete');
        }).catch(err => {
          throttledClose();
          log.error('frameless app menu error', err);
        });

        menuOpen = !menuOpen;
      }
    )
  );
};

const darwinFrame = (experiments) => {
  return dom.children(
    dom.div(experiments.filmstripOnLeft ? name : `${name}-partial`),
    dom.classname(dom.icon('control_camera'), 'right')
  );
};

module.exports = (obj, { experiments }) => {
  const elem = process.platform === 'darwin' ? darwinFrame(experiments) : defaultFrame();
  return { elem, style };
};
