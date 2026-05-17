const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getForwardableRangeHeader,
  sanitizeRangeHeader,
} = require('../src/utils/range-header');

test('sanitizeRangeHeader accepts valid byte ranges', () => {
  assert.equal(sanitizeRangeHeader('bytes=0-499'), 'bytes=0-499');
  assert.equal(sanitizeRangeHeader(' bytes=500- '), 'bytes=500-');
  assert.equal(sanitizeRangeHeader('bytes=-500'), 'bytes=-500');
});

test('sanitizeRangeHeader rejects malformed or oversized ranges', () => {
  assert.equal(sanitizeRangeHeader(undefined), null);
  assert.equal(sanitizeRangeHeader(''), null);
  assert.equal(sanitizeRangeHeader('items=0-1'), 'invalid');
  assert.equal(sanitizeRangeHeader('bytes=0-1,2-3'), 'invalid');
  assert.equal(sanitizeRangeHeader(`bytes=${'1'.repeat(90)}-`), 'too-long');
});

test('getForwardableRangeHeader forwards valid ranges', () => {
  assert.equal(
    getForwardableRangeHeader({ headers: { range: 'bytes=0-1024' } }),
    'bytes=0-1024'
  );
});

test('getForwardableRangeHeader throws 416 for invalid ranges', () => {
  assert.throws(
    () => getForwardableRangeHeader({ headers: { range: 'bytes=0-1,2-3' } }),
    (error) => error.status === 416 && error.code === 'invalid_range'
  );
});
