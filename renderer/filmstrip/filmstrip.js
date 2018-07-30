const fs = require('fs');
const path = require('path');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  events.on('load:directory', function ({ dir }) {
    console.log('filmstrip loading', dir);
  });

  return { elem, style };
};
