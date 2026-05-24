const test = require('node:test');
const assert = require('node:assert/strict');
const { createIpRateLimit } = require('../src/utils/rate-limit');

function createResponseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('createIpRateLimit returns a safe code when the limit is exceeded', () => {
  const limiter = createIpRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1,
    message: 'Too many requests.',
    code: 'rate_limited',
  });
  const req = { ip: '203.0.113.50' };
  const firstResponse = createResponseRecorder();
  const secondResponse = createResponseRecorder();
  let nextCalls = 0;

  limiter(req, firstResponse, () => {
    nextCalls += 1;
  });
  limiter(req, secondResponse, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(secondResponse.statusCode, 429);
  assert.deepEqual(secondResponse.body, {
    error: 'Too many requests.',
    code: 'rate_limited',
  });
});
