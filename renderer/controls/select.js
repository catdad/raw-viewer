const EventEmitter = require('events');

module.exports = ({ values }) => {
  const ev = new EventEmitter();
  const select = document.createElement('select');
  select.className = 'select';

  const options = values.map((val) => {
    const opt = document.createElement('option');
    opt.appendChild(document.createTextNode(val.label));
    opt.x_value = val.value;

    select.appendChild(opt);

    return opt;
  });

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
    value: () => {}
  });
};
