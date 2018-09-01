module.exports = function bufferToUrl(buff) {
  return `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
};
