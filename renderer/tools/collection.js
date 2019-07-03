const forEach = async (collection, func) => {
  for (let idx in collection) {
    await func(collection[idx], idx, collection);
  }
};

const map = async (collection, func) => {
  const result = [];

  await forEach(collection, async (item, idx, coll) => {
    result.push(await func(item, idx, coll));
  });

  return result;
};

const reduce = async (collection, func, init) => {
  const hasInit = init !== undefined;
  let result;

  await forEach(hasInit ? [init, ...collection] : collection, async (item, idx, coll) => {
    if (idx === 0) {
      result = item;
      return;
    }

    result = await func(result, item, hasInit ? idx - 1 : idx, coll);
  });

  return result;
};

const filter = async (collection, func) => {
  const result = [];

  await forEach(collection, async (item, idx, coll) => {
    if (await func(item, idx, coll)) {
      result.push(item);
    }
  });

  return result;
};

module.exports = { filter, forEach, map, reduce };
