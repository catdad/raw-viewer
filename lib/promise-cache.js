module.exports = function memoize(fn) {
  let temp = {};
  let cache = {};

  const memoized = async function(first, ...args) {
    // we already have this cached, so
    // return the previous result
    if (cache[first]) {
      return cache[first];
    }

    // this is already being retrieved,
    // so wait for the original to return a
    // value and use the same value here
    if (temp[first]) {
      return await temp[first];
    }

    // fetch a new value and save it
    const promise = fn(first, ...args);
    temp[first] = promise;

    const result = await promise;
    delete temp[first];

    cache[first] = result;

    return result;
  };

  memoized.clear = (first) => {
    if (cache[first]) {
      delete cache[first];
    }

    if (temp[first]) {
      temp[first].then(() => {
        delete cache[first];
      });
    }
  };

  memoized.reset = () => {
    temp = {};
    cache = {};
  };

  return memoized;
};
