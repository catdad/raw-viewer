const name = 'shortcuts';
const style = true;

const analytics = require('../../lib/analytics.js');
const dom = require('../tools/dom.js');

const actions = (...keys) => {
  return keys.reduce((m, key, i) => {
    if (i !== 0) {
      m.push(dom.classname(dom.span('+'), 'sep'));
    }

    if (key === 'click') {
      m.push(dom.icon('mouse'));
    } else {
      m.push(dom.classname(dom.span(key), 'key'));
    }

    return m;
  }, []);
};

const combo = (keys, description) => {
  return dom.children(
    dom.div('row'),
    dom.children(
      dom.classname(dom.div(), 'cell', 'keys'),
      ...actions(...keys)
    ),
    dom.children(
      dom.classname(dom.div(), 'cell', 'description'),
      dom.text(description)
    )
  );
};

module.exports = ({ events }) => {
  const elem = dom.children(
    dom.div(name),
    dom.children(
      dom.div('table'),
      combo(['Z', 'click'], 'zoom in on the image'),
      combo(['Z', 'Alt', 'click'], 'zoom out on the image'),
      combo(['0'], 'rate the current image 0 starts'),
      combo(['1'], 'rate the current image 1 start'),
      combo(['2'], 'rate the current image 2 starts'),
      combo(['3'], 'rate the current image 3 starts'),
      combo(['4'], 'rate the current image 4 starts'),
      combo(['5'], 'rate the current image 5 starts'),
    )
  );

  events.on('shortcuts', () => {
    analytics.screenview('shortcuts');
    events.emit('modal', { content: elem });
  });

  return { style };
};
