const name = 'shortcuts';
const style = true;

const dom = require('../tools/dom.js');

const actions = (...keys) => {
  return keys.map(key => {
    if (key === 'click') {
      return dom.classname(dom.span(key), 'click');
    }

    return dom.classname(dom.span(key), 'key');
  });
};

const combo = (keys, description) => {
  return dom.children(
    dom.div('row'),
    dom.children(
      dom.div('cell'),
      ...actions(...keys)
    ),
    dom.children(
      dom.div('cell'),
      dom.text(description)
    )
  );
};

module.exports = ({ events }) => {
  const elem = dom.children(
    dom.div(name),
    dom.children(
      dom.div('table'),
      combo(['Z', 'click'], 'zoom in on image'),
      combo(['Z', 'Alt', 'click'], 'zoom out on image')
    )
  );

  events.on('shortcuts', () => {
    events.emit('modal', { content: elem });
  });

  return { style };
};
