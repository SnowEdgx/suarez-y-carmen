const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSha256Hash,
  isUuid,
} = require('../src/utils/validation');
const {
  normalizeHref,
  normalizeUrl,
} = require('../src/services/cms-sync/validation');

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

test('normalizeHref accepts safe editorial links', () => {
  assert.equal(normalizeHref('/courses/bachazouk-vol-1-tilted-turns', 'primaryCtaHref'), '/courses/bachazouk-vol-1-tilted-turns');
  assert.equal(normalizeHref('#contact', 'primaryCtaHref'), '#contact');
  assert.equal(normalizeHref('https://suarezycarmenbachata.com/courses', 'primaryCtaHref'), 'https://suarezycarmenbachata.com/courses');
});

test('normalizeHref rejects ambiguous internal editorial links', () => {
  assert.throws(() => normalizeHref('/courses/../profile', 'primaryCtaHref'), /valid HTTP URL/);
  assert.throws(() => normalizeHref('/courses/%2e%2e/profile', 'primaryCtaHref'), /valid HTTP URL/);
  assert.throws(() => normalizeHref('/courses/%2Fprofile', 'primaryCtaHref'), /valid HTTP URL/);
  assert.throws(() => normalizeHref('/courses\\profile', 'primaryCtaHref'), /valid HTTP URL/);
});

test('normalizeUrl rejects credentials in editorial URLs', () => {
  assert.equal(
    normalizeUrl('https://maps.example.com/place?q=bachata#details', 'locationUrl'),
    'https://maps.example.com/place?q=bachata#details'
  );
  assert.throws(() => normalizeUrl('https://user:pass@example.com/course', 'ticketUrl'), /valid HTTP URL/);
});
