const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFrontendReturnUrl,
  getFrontendUrl,
  sanitizeCheckoutSessionId,
  sanitizeReturnPath,
} = require('../src/services/stripe-client.service');

test('sanitizeCheckoutSessionId accepts only Stripe Checkout session ids', () => {
  assert.equal(sanitizeCheckoutSessionId(' cs_test_123ABC_foo '), 'cs_test_123ABC_foo');
  assert.equal(sanitizeCheckoutSessionId('pi_123'), null);
  assert.equal(sanitizeCheckoutSessionId('cs_test_123?x=1'), null);
  assert.equal(sanitizeCheckoutSessionId(null), null);
});

test('sanitizeReturnPath accepts course-only return paths', () => {
  assert.equal(sanitizeReturnPath('/courses'), '/courses');
  assert.equal(sanitizeReturnPath('/courses/bachazouk-vol-1-tilted-turns'), '/courses/bachazouk-vol-1-tilted-turns');
  assert.equal(sanitizeReturnPath('/courses?checkout=service_unavailable'), '/courses?checkout=service_unavailable');
  assert.equal(sanitizeReturnPath('/courses#lesson-1'), '/courses#lesson-1');
});

test('sanitizeReturnPath rejects external or normalized paths', () => {
  assert.equal(sanitizeReturnPath('https://example.com/courses'), '/courses');
  assert.equal(sanitizeReturnPath('//example.com/courses'), '/courses');
  assert.equal(sanitizeReturnPath('/profile'), '/courses');
  assert.equal(sanitizeReturnPath('/courses/../profile'), '/courses');
  assert.equal(sanitizeReturnPath('/courses/%2e%2e/profile'), '/courses');
  assert.equal(sanitizeReturnPath('/courses/%2Fprofile'), '/courses');
  assert.equal(sanitizeReturnPath('/courses\\profile'), '/courses');
  assert.equal(sanitizeReturnPath('/courses\r\nSet-Cookie:test'), '/courses');
  assert.equal(sanitizeReturnPath(`/courses/${'a'.repeat(501)}`), '/courses');
});

test('buildFrontendReturnUrl appends checkout parameters predictably', () => {
  assert.equal(
    buildFrontendReturnUrl('https://suarezycarmenbachata.com/', '/courses', {
      success: 'true',
      session_id: '{CHECKOUT_SESSION_ID}',
    }),
    'https://suarezycarmenbachata.com/courses?success=true&session_id={CHECKOUT_SESSION_ID}'
  );

  assert.equal(
    buildFrontendReturnUrl('https://suarezycarmenbachata.com', '/courses/bachazouk?lesson=1', {
      canceled: 'true',
    }),
    'https://suarezycarmenbachata.com/courses/bachazouk?lesson=1&canceled=true'
  );
});

test('getFrontendUrl uses localhost only outside production', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'development';

    assert.equal(getFrontendUrl(), 'http://localhost:3000');
  } finally {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('getFrontendUrl validates production configuration', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://suarezycarmenbachata.com/';
    assert.equal(getFrontendUrl(), 'https://suarezycarmenbachata.com');

    delete process.env.FRONTEND_URL;
    assert.throws(
      () => getFrontendUrl(),
      (error) =>
        error.status === 503 &&
        error.message === 'FRONTEND_URL is required in production.'
    );

    process.env.FRONTEND_URL = 'file:///tmp/site';
    assert.throws(
      () => getFrontendUrl(),
      (error) =>
        error.status === 503 &&
        error.message === 'FRONTEND_URL must be a valid HTTP URL.'
    );

    process.env.FRONTEND_URL = 'https://suarezycarmenbachata.com?from=checkout';
    assert.throws(
      () => getFrontendUrl(),
      (error) =>
        error.status === 503 &&
        error.message === 'FRONTEND_URL must be a valid HTTP URL.'
    );
  } finally {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
