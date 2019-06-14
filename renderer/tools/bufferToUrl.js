function bufferToUrl(buff, type = 'image/jpeg') {
  return `data:${type};base64,${Buffer.from(buff).toString('base64')}`;
}

function urlToBuffer(url) {
  const base64 = url.split(';base64,').pop();
  const buffer = Buffer.from(base64, 'base64');
  return buffer;
}

module.exports = { bufferToUrl, urlToBuffer };
