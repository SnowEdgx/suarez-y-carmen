process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'local-test-service-role-key';
process.env.SUPABASE_RESOURCE_BUCKET ||= 'course-resources';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveResourceStorageReference } = require('../src/services/resource-storage.service');

test('resolveResourceStorageReference accepts private resource paths', () => {
  assert.deepEqual(resolveResourceStorageReference('bachazouk/guia.pdf'), {
    bucket: 'course-resources',
    path: 'bachazouk/guia.pdf',
  });
  assert.deepEqual(resolveResourceStorageReference('course-resources/bachazouk/guia.pdf'), {
    bucket: 'course-resources',
    path: 'bachazouk/guia.pdf',
  });
  assert.deepEqual(resolveResourceStorageReference('course-resources:bachazouk/guia.pdf'), {
    bucket: 'course-resources',
    path: 'bachazouk/guia.pdf',
  });
});

test('resolveResourceStorageReference rejects unsafe or external resource paths', () => {
  assert.equal(resolveResourceStorageReference('bachazouk/../guia.pdf'), null);
  assert.equal(resolveResourceStorageReference('bachazouk//guia.pdf'), null);
  assert.equal(resolveResourceStorageReference('bachazouk\\guia.pdf'), null);
  assert.equal(resolveResourceStorageReference('bachazouk/%2e%2e/guia.pdf'), null);
  assert.equal(resolveResourceStorageReference('https://example.com/guia.pdf'), null);
  assert.equal(resolveResourceStorageReference('other-bucket:bachazouk/guia.pdf'), null);
});
