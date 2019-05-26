const { BrowserWindow } = require('electron').remote;

const name = 'frame';
const style = true;

const dom = require('../tools/dom.js');

module.exports = () => {
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
    })
  );

  return { elem, style };
};
