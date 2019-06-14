module.exports = function bufferToUrl(buff) {
  return `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
};

// TODO clean up so that both are exported as named functions
// TODO this needs to be used throughout other parts of the app
// that convert data urls to buffer
module.exports.reverse = (url) => {
  const base64 = url.split(';base64,').pop();
  const buffer = Buffer.from(base64, 'base64');
  return buffer;
};
