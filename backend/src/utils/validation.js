const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_REGEX = /^[a-f0-9]{64}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function isSha256Hash(value) {
  return typeof value === 'string' && HASH_REGEX.test(value);
}

module.exports = {
  HASH_REGEX,
  UUID_REGEX,
  isSha256Hash,
  isUuid,
};
