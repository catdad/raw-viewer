module.exports = ({ name, values }) => {
  const select = document.createElement('select');
  select.className = 'select';

  const options = values.map((val, idx) => {
    const opt = document.createElement('option');
    opt.appendChild(document.createTextNode(val));

    select.appendChild(opt);

    return opt;
  });

  return Object.defineProperties({
    elem: select
  }, {
    value: () => {}
  });
};
