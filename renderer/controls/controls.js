const dom = require('../tools/dom.js');
const toggle = require('./toggle.js');
const select = require('./select.js');

const name = 'controls';
const style = true;

const defaultRating = { from: 0, to: 5 };
const defaultType = '*';

module.exports = ({ events }) => {
  const elem = dom.div(name);

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
      { label: '★ all', value: { from: 0, to: 5 } },
      { label: '★ 0',   value: { from: 0, to: 0 } },
      { label: '★ 1',   value: { from: 1, to: 1 } },
      { label: '★ 1+',  value: { from: 1, to: 5 } },
      { label: '★ 2',   value: { from: 2, to: 2 } },
      { label: '★ 2+',  value: { from: 2, to: 5 } },
      { label: '★ 3',   value: { from: 3, to: 3 } },
      { label: '★ 3+',  value: { from: 3, to: 5 } },
      { label: '★ 4',   value: { from: 4, to: 4 } },
      { label: '★ 4+',  value: { from: 4, to: 5 } },
      { label: '★ 5',   value: { from: 5, to: 5 } }
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

  dom.children(elem, zoom.elem, ratingFilter.elem, typeFilter.elem);

  events.on('directory:discover', ({ files }) => {
    // reset values to default
    ratingFilter.value = defaultRating;
    typeFilter.value = defaultType;

    // setting the value of a select doesn't fire a change event
    // not sure why...
    events.emit('image:filter', {
      rating: defaultRating,
      type: defaultType
    });

    const types = Array.from(new Set(files.map(file => file.type)))
      .filter(val => !!val)
      .sort((a, b) => a.localeCompare(b));

    typeFilter.values = [{ label: 'all', value: '*' }]
      .concat(types.map(type => ({ label: type, value: type })));
  });

  return { elem, style };
};
