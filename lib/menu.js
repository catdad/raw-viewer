const { Menu } = require('electron');
const log = require('./log.js')('menu');

const template = [{
  label: process.platform === 'darwin' ? 'Raw Viewer' : 'Menu',
  submenu: [
    {
      label: 'Open',
      click: () => {
        log.info('open directory picker');
      },
      enabled: false
    },
    { type: 'separator' },
    { role: 'copy' },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        log.info('open about screen');
      },
      enabled: false
    },
    { role: 'reload' },
    { role: 'quit' }
  ]
}];

module.exports = Menu.buildFromTemplate(template);
