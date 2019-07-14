const uuidV4 = require('uuid/v4');

const uuid = () => {
  const id = uuidV4();

  // all IDs that start with 00000000 will be reserved for internal use
  // and will be filtered out of analytics
  return id.slice(0, 8) !== '00000000' ? id : uuid();
};

module.exports = uuid;
