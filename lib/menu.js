const { Menu } = require('electron')
const log = require('./log.js')('menu');

const template = [{
  label: 'File',
  submenu: [
    {
      label: 'Open',
      click: () => {
        log.info('open directory picker');
      }
    },
    { role: 'quit' }
  ]
}, {
  label: 'Edit',
  submenu: [
    { role: 'copy' }
  ]
}, {
  label: 'Help',
  submenu: [
    {
      label: 'About',
      click: () => {
        log.info('open about screen');
      }
    }
  ]
}];

module.exports = Menu.buildFromTemplate(template);
