const { supabase } = require('../config/supabase');
const { isSafeStorageObjectPath } = require('./video-storage/path-validation');

const configuredResourceBucket = (process.env.SUPABASE_RESOURCE_BUCKET || '').trim();
const DEFAULT_RESOURCE_BUCKET = configuredResourceBucket || 'course-resources';
const RESOURCE_SIGNED_URL_TTL_SECONDS = 300;

function isAllowedResourceBucket(bucket) {
  return bucket === DEFAULT_RESOURCE_BUCKET;
}

function resolveResourceStorageReference(rawValue) {
  if (typeof rawValue !== 'string') return null;

  const value = rawValue.trim().replace(/^\/+/, '');
  if (!value || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;

  const separatorIndex = value.indexOf(':');
  if (separatorIndex > 0) {
    const bucket = value.slice(0, separatorIndex).trim();
    const objectPath = value.slice(separatorIndex + 1).trim().replace(/^\/+/, '');
    if (!bucket || !objectPath) return null;
    if (!isAllowedResourceBucket(bucket)) return null;
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return { bucket, path: objectPath };
  }

  if (value.startsWith(`${DEFAULT_RESOURCE_BUCKET}/`)) {
    const objectPath = value.slice(DEFAULT_RESOURCE_BUCKET.length + 1);
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return { bucket: DEFAULT_RESOURCE_BUCKET, path: objectPath };
  }

  if (!isSafeStorageObjectPath(value)) return null;
  return { bucket: DEFAULT_RESOURCE_BUCKET, path: value };
}

async function createResourceSignedUrl(storageReference) {
  const { data, error } = await supabase.storage
    .from(storageReference.bucket)
    .createSignedUrl(storageReference.path, RESOURCE_SIGNED_URL_TTL_SECONDS, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    console.error('[Resource Storage Service] Error creating signed URL:', error?.message || 'unknown storage error');
    const signingError = new Error('Could not create signed resource URL.');
    signingError.status = 500;
    throw signingError;
  }

  return data.signedUrl;
}

module.exports = {
  createResourceSignedUrl,
  resolveResourceStorageReference,
};
