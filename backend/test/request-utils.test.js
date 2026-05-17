const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBearerToken,
  getClientIp,
  getUserAgent,
} = require('../src/utils/request');

test('getBearerToken extracts trimmed bearer tokens', () => {
  assert.equal(getBearerToken({ headers: { authorization: 'Bearer abc.def ' } }), 'abc.def');
});

test('getBearerToken rejects missing or malformed auth headers', () => {
  assert.equal(getBearerToken({ headers: {} }), null);
  assert.equal(getBearerToken({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(getBearerToken({ headers: { authorization: 'Bearer   ' } }), null);
});

test('getClientIp prefers Express resolved ip and falls back to socket', () => {
  assert.equal(getClientIp({ ip: '203.0.113.10', socket: { remoteAddress: '127.0.0.1' } }), '203.0.113.10');
  assert.equal(getClientIp({ socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
  assert.equal(getClientIp({}), 'unknown');
});

test('getUserAgent returns only string user agents', () => {
  assert.equal(getUserAgent({ headers: { 'user-agent': 'Mozilla/5.0' } }), 'Mozilla/5.0');
  assert.equal(getUserAgent({ headers: { 'user-agent': ['a', 'b'] } }), '');
});
