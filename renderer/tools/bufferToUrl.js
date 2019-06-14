function bufferToUrl(buff, type = 'image/jpeg') {
  return `data:${type};base64,${Buffer.from(buff).toString('base64')}`;
}

function urlToBuffer(url) {
  return Buffer.from(url.split(';base64,').pop(), 'base64');
}

module.exports = { bufferToUrl, urlToBuffer };
