const { Menu } = require('electron');
const log = require('./log.js')('menu');
const config = require('./config.js');

module.exports = (events, experiments = {}) => {
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
  }, {
    label: 'Experiments',
    submenu: [
      {
        label: 'Render From Raw Button',
        type: 'checkbox',
        click: (item, meh, ev) => {
          config.setProp('experiments.renderFromRaw', !!item.checked);
        },
        checked: !!experiments.renderFromRaw,
      }
    ]
  }];

  return Menu.buildFromTemplate(template);
};
