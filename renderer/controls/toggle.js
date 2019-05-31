const EventEmitter = require('events');

const dom = require('../tools/dom.js');

function getValue(radios) {
  for (let i = 0, l = radios.length; i < l; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }

  return null;
}

function setValue(radios, val) {
  for (let i = 0, l = radios.length; i < l; i++) {
    if (radios[i].value === val) {
      radios[i].checked = 'checked';
      return;
    }
  }
}

module.exports = function createToggle({ name, values }) {
  const ev = new EventEmitter();

  const radios = values.map((value, idx) => {
    const input = dom.props(dom.elem('input'), {
      type: 'radio',
      name,
      value
    });

    if (idx === 0) {
      input.checked = 'checked';
    }

    input.onclick = () => {
      ev.emit('click', { value });
    };

    input.onchange = () => {
      ev.emit('change', { value });
    };

    return input;
  });

  const elem = dom.children(
    dom.classname(dom.span(''), 'toggle'),
    ...radios
  );

  return Object.defineProperties({
    elem: elem,
    on: ev.on.bind(ev),
    off: ev.removeListener.bind(ev)
  }, {
    value: {
      get: () => getValue(radios),
      set: (val) => setValue(radios, val)
    }
  });
};
