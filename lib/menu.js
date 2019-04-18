const { Menu } = require('electron');
const log = require('./log.js')('menu');

module.exports = (events) => {
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
          events.emit('ipcevent', { name: 'about' });
        }
      },
      { role: 'reload' },
      { role: 'quit' }
    ]
  }];

  return Menu.buildFromTemplate(template);
};
