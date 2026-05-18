const { supabase } = require('../../config/supabase');

const RAW_SIGNED_URL_TTL_SECONDS = Number.parseInt(
  process.env.VIDEO_SIGNED_URL_TTL_SECONDS || '900',
  10
);
const SIGNED_URL_TTL_SECONDS =
  Number.isInteger(RAW_SIGNED_URL_TTL_SECONDS) && RAW_SIGNED_URL_TTL_SECONDS >= 60
    ? Math.min(RAW_SIGNED_URL_TTL_SECONDS, 3600)
    : 900;

async function createStorageSignedUrl(storageReference) {
  const { data, error } = await supabase.storage
    .from(storageReference.bucket)
    .createSignedUrl(storageReference.path, Math.min(SIGNED_URL_TTL_SECONDS, 300));

  if (error || !data?.signedUrl) {
    console.error(
      '[Video Storage Service] Error creating signed URL:',
      error?.message || 'unknown storage error'
    );
    const signingError = new Error('Could not create signed storage URL.');
    signingError.status = 500;
    throw signingError;
  }

  return data.signedUrl;
}

async function fetchStorageObject(storageReference, options = {}) {
  const signedUrl = await createStorageSignedUrl(storageReference);
  return fetch(signedUrl, {
    headers: options.rangeHeader ? { Range: options.rangeHeader } : {},
  });
}

module.exports = {
  createStorageSignedUrl,
  fetchStorageObject,
};
