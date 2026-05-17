const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSha256Hash,
  isUuid,
} = require('../src/utils/validation');

test('isUuid accepts valid UUIDs', () => {
  assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isUuid('550E8400-E29B-41D4-A716-446655440000'), true);
});

test('isUuid rejects malformed identifiers', () => {
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid('550e8400-e29b-11d4-7716-446655440000'), false);
  assert.equal(isUuid(null), false);
});

test('isSha256Hash accepts 64-character hex strings', () => {
  assert.equal(isSha256Hash('a'.repeat(64)), true);
  assert.equal(isSha256Hash('A'.repeat(64)), true);
});

test('isSha256Hash rejects non-hex or wrong length values', () => {
  assert.equal(isSha256Hash('g'.repeat(64)), false);
  assert.equal(isSha256Hash('a'.repeat(63)), false);
  assert.equal(isSha256Hash(undefined), false);
});
