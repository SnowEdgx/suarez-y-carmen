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

test('createIpRateLimit can limit by a custom key instead of the shared client IP', () => {
  const limiter = createIpRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1,
    message: 'Too many requests.',
    code: 'rate_limited',
    keyGenerator: (req) => req.headers.session || null,
  });
  const sharedIp = '198.51.100.7';
  const firstUser = { ip: sharedIp, headers: { session: 'a' } };
  const secondUser = { ip: sharedIp, headers: { session: 'b' } };
  const responses = [createResponseRecorder(), createResponseRecorder(), createResponseRecorder()];
  let nextCalls = 0;
  const next = () => {
    nextCalls += 1;
  };

  limiter(firstUser, responses[0], next);
  limiter(secondUser, responses[1], next);
  limiter(firstUser, responses[2], next);

  assert.equal(nextCalls, 2);
  assert.equal(responses[1].statusCode, null);
  assert.equal(responses[2].statusCode, 429);
});
