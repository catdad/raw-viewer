const EventEmitter = require('events');
const equal = require('fast-deep-equal');

function setOptions(select, values) {
  select.innerHTML = '';

  values.forEach((val) => {
    const opt = document.createElement('option');
    opt.appendChild(document.createTextNode(val.label));
    opt.x_value = val.value;

    select.appendChild(opt);
  });
}

function setOption(select, value) {
  for (let i = 0, l = select.options.length; i < l; i++) {
    if (equal(select.options[i].x_value, value)) {
      select.selectedIndex = 0;
      return;
    }
  }
}

function getOption(select) {
  return select[select.selectedIndex].x_value;
}

module.exports = ({ values }) => {
  const ev = new EventEmitter();
  const select = document.createElement('select');
  select.className = 'select';

  setOptions(select, values);

  select.onchange = () => {
    ev.emit('change', {
      value: select.options[select.selectedIndex].x_value,
      label: select.value
    });
  };

  return Object.defineProperties({
    elem: select,
    on: ev.on.bind(ev),
    off: ev.removeListener.bind(ev)
  }, {
    value: {
      configurable: false,
      enumerable: true,
      get: () => getOption(select),
      set: (value) => setOption(select, value)
    },
    values: {
      configurable: false,
      enumetable: true,
      get: () => {},
      set: (values) => setOptions(select, values)
    }
  });
};
