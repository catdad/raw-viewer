const fs = require('fs');
const path = require('path');

const toggle = require('./toggle.js');
const select = require('./select.js');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const zoom = toggle({
    name: 'zoom',
    values: [ 'fit', '1:1' ]
  });

  zoom.on('change', ({ value }) => {
    events.emit('image:zoom', { scale: value === '1:1' ? 1 : 'fit' });
  });

  const ratingFilter = select({
    name: 'rating',
    values: [
      { label: '★ 0+', value: 0 },
      { label: '★ 1+', value: 1 },
      { label: '★ 2+', value: 2 },
      { label: '★ 3+', value: 3 },
      { label: '★ 4+', value: 4 },
      { label: '★ 5', value: 5 }
    ]
  });

  ratingFilter.on('change', ({ value }) => {
    events.emit('image:filter', { rating: value });
  });

  const typeFilter = select({
    name: 'type',
    values: [
      { label: 'all', value: '*' }
    ]
  });

  typeFilter.on('change', ({ value }) => {
    events.emit('image:filter', { type: value });
  });

  elem.appendChild(zoom.elem);
  elem.appendChild(ratingFilter.elem);
  elem.appendChild(typeFilter.elem);

  events.on('image:load', () => {
    zoom.value = 'fit';
  });

  events.on('directory:discover', ({ files }) => {
    ratingFilter.value = 0;
    typeFilter.value = '*';

    // setting the value of a select doesn't fire a change event
    // not sure why... as Chrome
    events.emit('image:filter', { rating: 0, type: '*' });

    const types = Array.from(new Set(files.map(file => file.type)))
      .filter(val => !!val)
      .sort((a, b) => a.localeCompare(b));

    typeFilter.values = [{ label: 'all', value: '*' }]
      .concat(types.map(type => ({ label: type, value: type })));
  });

  return { elem, style };
};
