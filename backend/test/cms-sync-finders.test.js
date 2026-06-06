const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFallbackOwnership } = require('../src/services/cms-sync/identity');

test('CMS fallback ownership accepts unlinked rows for adoption', () => {
  const row = { id: 'course-id', cms_document_id: null };

  assert.equal(
    assertFallbackOwnership(row, 'new-document-id', 'Course', 'slug "bachazouk"'),
    row
  );
});

test('CMS fallback ownership accepts rows already linked to the same document', () => {
  const row = { id: 'course-id', cms_document_id: 'same-document-id' };

  assert.equal(
    assertFallbackOwnership(row, 'same-document-id', 'Course', 'slug "bachazouk"'),
    row
  );
});

test('CMS fallback ownership rejects rows linked to another document', () => {
  const row = { id: 'course-id', cms_document_id: 'existing-document-id' };

  assert.throws(
    () => assertFallbackOwnership(row, 'new-document-id', 'Course', 'slug "bachazouk"'),
    {
      message: 'Course fallback match by slug "bachazouk" is already linked to another CMS document.',
      status: 409,
    }
  );
});
