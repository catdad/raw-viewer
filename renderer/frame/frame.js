const name = 'frame';
const style = true;
const log = require('../../lib/log.js')(name);

const dom = require('../tools/dom.js');

module.exports = ({ events }) => {
  const elem = dom.div(name);

  return { elem, style };
};
