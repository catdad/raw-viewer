module.exports = function promisify(func) {
  return function(...args) {
    return new Promise(function (resolve, reject) {
      try {
        return func.apply(null, [...args, function (err, res) {
          if (err) {
            return reject(err);
          }

          return resolve(res);
        }]);
      } catch(err) {
        return reject(err);
      }
    });
  };
};
