const EventEmitter = require('events');

function getValue(radios) {
  for (var i = 0, l = radios.length; i < l; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }

  return null;
}

module.exports = function createToggle({ name, values }) {
  const ev = new EventEmitter();
  const div = document.createElement('span');
  div.className = 'toggle';

  const radios = values.map((val, idx) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = val;

    if (idx === 0) {
      input.checked = 'checked';
    }

    input.onclick = () => {
      ev.emit('click', { value: val });
    };

    input.onchange = () => {
      ev.emit('change', { value: val });
    };

    div.appendChild(input);

    return input;
  });

  return Object.defineProperties({
    elem: div,
    on: ev.on.bind(ev),
    off: ev.removeListener.bind(ev)
  }, {
    value: {
      get: () => getValue(radios)
    }
  });
};
