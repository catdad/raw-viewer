const fs = require('fs');
const path = require('path');

const name = 'about';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = ({ events }) => {

  events.on('about', () => {
    events.emit('modal', { str: 'about modal' });
  });

  return { style };
};
