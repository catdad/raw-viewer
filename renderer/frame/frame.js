const { BrowserWindow } = require('electron').remote;

const name = 'frame';
const style = true;

const log = require('../../lib/log.js')(name);
const menu = require('../../lib/menu.js');
const dom = require('../tools/dom.js');

module.exports = () => {
  let menuOpen = false;

  const elem = dom.children(
    dom.div(name),
    dom.click(dom.icon('close'), () => {
      BrowserWindow.getFocusedWindow().close();
    }),
    dom.click(dom.icon('flip_to_front'), () => {
      const browser = BrowserWindow.getFocusedWindow();

      if (browser.isMaximized()) {
        browser.unmaximize();
      } else {
        browser.maximize();
      }
    }),
    dom.click(dom.icon('minimize'), () => {
      BrowserWindow.getFocusedWindow().minimize();
    }),
    dom.click(dom.icon('reorder'), (e) => {
      const rect = e.target.getBoundingClientRect();

      menu[menuOpen ? 'closeContext' : 'openContext']({
        x: rect.left,
        y: rect.bottom
      }).then(() => {
        log.info('opened frameless app menu');
      }).catch(err => {
        log.error('frameless app menu error', err);
      });

      menuOpen = !menuOpen;
    })
  );

  return { elem, style };
};
