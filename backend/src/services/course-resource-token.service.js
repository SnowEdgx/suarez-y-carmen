const { createHmac, randomUUID, timingSafeEqual } = require('crypto');
const { supabaseServiceKey } = require('../config/supabase');
const { UUID_REGEX } = require('../utils/validation');
const { resolveResourceStorageReference } = require('./resource-storage.service');

const isProduction = process.env.NODE_ENV === 'production';
const RAW_RESOURCE_TOKEN_TTL_SECONDS = Number.parseInt(
  process.env.COURSE_RESOURCE_TOKEN_TTL_SECONDS || '300',
  10
);
const COURSE_RESOURCE_TOKEN_TTL_SECONDS =
  Number.isInteger(RAW_RESOURCE_TOKEN_TTL_SECONDS) && RAW_RESOURCE_TOKEN_TTL_SECONDS >= 60
    ? Math.min(RAW_RESOURCE_TOKEN_TTL_SECONDS, 900)
    : 300;
const COURSE_RESOURCE_TOKEN_SECRET =
  process.env.COURSE_RESOURCE_TOKEN_SECRET || process.env.VIDEO_PLAYBACK_TOKEN_SECRET || supabaseServiceKey;

if (isProduction && !process.env.COURSE_RESOURCE_TOKEN_SECRET && !process.env.VIDEO_PLAYBACK_TOKEN_SECRET) {
  throw new Error('COURSE_RESOURCE_TOKEN_SECRET or VIDEO_PLAYBACK_TOKEN_SECRET is required in production.');
}

const MAX_RESOURCE_TOKEN_LENGTH = 4096;
const RESOURCE_VIEW_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RESOURCE_VIEW_RATE_LIMIT_MAX_REQUESTS = 120;
const resourceViewBuckets = new Map();

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signResourcePayload(encodedPayload) {
  return createHmac('sha256', COURSE_RESOURCE_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function createCourseResourceToken({ resourceId, storageReference, userId }) {
  const nonce = randomUUID();
  const payload = {
    resourceId,
    bucket: storageReference.bucket,
    path: storageReference.path,
    userId: userId || null,
    exp: Math.floor(Date.now() / 1000) + COURSE_RESOURCE_TOKEN_TTL_SECONDS,
    nonce,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signResourcePayload(encodedPayload);
  return {
    token: `${encodedPayload}.${signature}`,
    nonce,
  };
}

function parseCourseResourceToken(rawToken) {
  if (
    typeof rawToken !== 'string' ||
    rawToken.length > MAX_RESOURCE_TOKEN_LENGTH ||
    !rawToken.includes('.')
  ) {
    return null;
  }

  const parts = rawToken.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;
  if (encodedPayload.length > 2048 || signature.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]+$/.test(signature)) {
    return null;
  }

  const expectedSignature = signResourcePayload(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload || typeof payload !== 'object') return null;
    if (!UUID_REGEX.test(payload.resourceId)) return null;
    if (!UUID_REGEX.test(payload.nonce)) return null;
    if (payload.userId !== null && !UUID_REGEX.test(payload.userId)) return null;
    if (!Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;

    const storageReference = resolveResourceStorageReference(`${payload.bucket}:${payload.path}`);
    if (!storageReference) return null;

    return {
      ...payload,
      storageReference,
    };
  } catch {
    return null;
  }
}

function assertCourseResourceTokenRateLimit(tokenNonce) {
  const now = Date.now();
  const bucket = resourceViewBuckets.get(tokenNonce);

  if (!bucket || now - bucket.windowStart >= RESOURCE_VIEW_RATE_LIMIT_WINDOW_MS) {
    resourceViewBuckets.set(tokenNonce, { windowStart: now, count: 1 });
    return;
  }

  if (bucket.count >= RESOURCE_VIEW_RATE_LIMIT_MAX_REQUESTS) {
    const error = new Error('Course resource token request limit exceeded.');
    error.status = 429;
    error.code = 'resource_rate_limited';
    throw error;
  }

  bucket.count += 1;
  resourceViewBuckets.set(tokenNonce, bucket);
}

setInterval(() => {
  const now = Date.now();
  for (const [tokenNonce, bucket] of resourceViewBuckets.entries()) {
    if (now - bucket.windowStart >= RESOURCE_VIEW_RATE_LIMIT_WINDOW_MS * 2) {
      resourceViewBuckets.delete(tokenNonce);
    }
  }
}, RESOURCE_VIEW_RATE_LIMIT_WINDOW_MS).unref();

module.exports = {
  COURSE_RESOURCE_TOKEN_TTL_SECONDS,
  assertCourseResourceTokenRateLimit,
  createCourseResourceToken,
  parseCourseResourceToken,
};
