const ratings = {
  '0': '☆☆☆☆☆',
  '1': '★☆☆☆☆',
  '2': '★★☆☆☆',
  '3': '★★★☆☆',
  '4': '★★★★☆',
  '5': '★★★★★'
};

module.exports = function ({ filepath, meta }) {
  const elem = document.createElement('div');
  elem.className = 'rating';

  elem.appendChild(document.createTextNode(ratings[meta.rating || 0]));

  return elem;
};
