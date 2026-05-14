const { createHmac, randomUUID, timingSafeEqual } = require('crypto');
const { supabaseServiceKey } = require('../config/supabase');
const { HASH_REGEX, UUID_REGEX } = require('../utils/validation');

const isProduction = process.env.NODE_ENV === 'production';
const RAW_PLAYBACK_TOKEN_TTL_SECONDS = Number.parseInt(
  process.env.VIDEO_PLAYBACK_TOKEN_TTL_SECONDS || '900',
  10
);
const PLAYBACK_TOKEN_TTL_SECONDS =
  Number.isInteger(RAW_PLAYBACK_TOKEN_TTL_SECONDS) && RAW_PLAYBACK_TOKEN_TTL_SECONDS >= 60
    ? Math.min(RAW_PLAYBACK_TOKEN_TTL_SECONDS, 3600)
    : 900;
const PLAYBACK_TOKEN_SECRET =
  process.env.VIDEO_PLAYBACK_TOKEN_SECRET || supabaseServiceKey;

if (isProduction && !process.env.VIDEO_PLAYBACK_TOKEN_SECRET) {
  throw new Error('VIDEO_PLAYBACK_TOKEN_SECRET is required in production.');
}

const MAX_PLAYBACK_TOKEN_LENGTH = 4096;
const PLAYBACK_STREAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PLAYBACK_STREAM_RATE_LIMIT_MAX_REQUESTS = 240;
const playbackStreamBuckets = new Map();

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPlaybackPayload(encodedPayload) {
  return createHmac('sha256', PLAYBACK_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function createPlaybackToken({ lessonId, userId, deviceIdHash }) {
  const nonce = randomUUID();
  const payload = {
    lessonId,
    userId: userId || null,
    deviceIdHash: userId && deviceIdHash ? deviceIdHash : null,
    exp: Math.floor(Date.now() / 1000) + PLAYBACK_TOKEN_TTL_SECONDS,
    nonce,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPlaybackPayload(encodedPayload);
  return {
    token: `${encodedPayload}.${signature}`,
    nonce,
  };
}

function parsePlaybackToken(rawToken) {
  if (
    typeof rawToken !== 'string' ||
    rawToken.length > MAX_PLAYBACK_TOKEN_LENGTH ||
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

  const expectedSignature = signPlaybackPayload(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload || typeof payload !== 'object') return null;
    if (!UUID_REGEX.test(payload.lessonId)) return null;
    if (!UUID_REGEX.test(payload.nonce)) return null;
    if (payload.userId !== null && !UUID_REGEX.test(payload.userId)) return null;
    if (payload.deviceIdHash !== null && !HASH_REGEX.test(payload.deviceIdHash)) return null;
    if (!Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function assertPlaybackTokenRateLimit(tokenNonce) {
  const now = Date.now();
  const bucket = playbackStreamBuckets.get(tokenNonce);

  if (!bucket || now - bucket.windowStart >= PLAYBACK_STREAM_RATE_LIMIT_WINDOW_MS) {
    playbackStreamBuckets.set(tokenNonce, { windowStart: now, count: 1 });
    return;
  }

  if (bucket.count >= PLAYBACK_STREAM_RATE_LIMIT_MAX_REQUESTS) {
    const error = new Error('Playback token request limit exceeded.');
    error.status = 429;
    error.code = 'playback_rate_limited';
    throw error;
  }

  bucket.count += 1;
  playbackStreamBuckets.set(tokenNonce, bucket);
}

setInterval(() => {
  const now = Date.now();
  for (const [tokenNonce, bucket] of playbackStreamBuckets.entries()) {
    if (now - bucket.windowStart >= PLAYBACK_STREAM_RATE_LIMIT_WINDOW_MS * 2) {
      playbackStreamBuckets.delete(tokenNonce);
    }
  }
}, PLAYBACK_STREAM_RATE_LIMIT_WINDOW_MS).unref();

module.exports = {
  PLAYBACK_TOKEN_TTL_SECONDS,
  assertPlaybackTokenRateLimit,
  createPlaybackToken,
  parsePlaybackToken,
};
