process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'local-test-service-role-key';
process.env.SUPABASE_RESOURCE_BUCKET ||= 'course-resources';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveResourceStorageReference } = require('../src/services/resource-storage.service');
const {
  createCourseResourceToken,
  parseCourseResourceToken,
} = require('../src/services/course-resource-token.service');

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

test('course resource tokens preserve only safe private storage references', () => {
  const token = createCourseResourceToken({
    resourceId: '11111111-1111-4111-8111-111111111111',
    storageReference: {
      bucket: 'course-resources',
      path: 'bachazouk/guia.pdf',
    },
    userId: '22222222-2222-4222-8222-222222222222',
  });

  const parsed = parseCourseResourceToken(token.token);
  assert.equal(parsed.resourceId, '11111111-1111-4111-8111-111111111111');
  assert.deepEqual(parsed.storageReference, {
    bucket: 'course-resources',
    path: 'bachazouk/guia.pdf',
  });
});

test('course resource tokens reject tampered payloads', () => {
  const token = createCourseResourceToken({
    resourceId: '11111111-1111-4111-8111-111111111111',
    storageReference: {
      bucket: 'course-resources',
      path: 'bachazouk/guia.pdf',
    },
    userId: null,
  });

  assert.equal(parseCourseResourceToken(`${token.token}tampered`), null);
  assert.equal(parseCourseResourceToken('not-a-token'), null);
});
