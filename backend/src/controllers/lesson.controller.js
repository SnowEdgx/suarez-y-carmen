const { createHmac, randomUUID, timingSafeEqual } = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const { createClient } = require('@supabase/supabase-js');

function resolveSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) return rawUrl;

  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }

  return rawUrl;
}

const resolvedSupabaseUrl = resolveSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!resolvedSupabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase env vars in lesson controller (SUPABASE_URL and service role key).'
  );
}

const supabase = createClient(
  resolvedSupabaseUrl,
  supabaseServiceKey
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_REGEX = /^[a-f0-9]{64}$/i;
const DEFAULT_VIDEO_BUCKET = (process.env.SUPABASE_VIDEO_BUCKET || 'course-videos').trim();
const RAW_SIGNED_URL_TTL_SECONDS = Number.parseInt(
  process.env.VIDEO_SIGNED_URL_TTL_SECONDS || '900',
  10
);
const SIGNED_URL_TTL_SECONDS =
  Number.isInteger(RAW_SIGNED_URL_TTL_SECONDS) && RAW_SIGNED_URL_TTL_SECONDS >= 60
    ? Math.min(RAW_SIGNED_URL_TTL_SECONDS, 3600)
    : 900;
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
const VIDEO_AUDIT_HASH_SECRET =
  process.env.VIDEO_AUDIT_HASH_SECRET || PLAYBACK_TOKEN_SECRET;
const RAW_MAX_ACTIVE_VIDEO_DEVICES = Number.parseInt(
  process.env.VIDEO_MAX_ACTIVE_DEVICES || '2',
  10
);
const MAX_ACTIVE_VIDEO_DEVICES =
  Number.isInteger(RAW_MAX_ACTIVE_VIDEO_DEVICES) && RAW_MAX_ACTIVE_VIDEO_DEVICES >= 1
    ? Math.min(RAW_MAX_ACTIVE_VIDEO_DEVICES, 10)
    : 2;
const RAW_VIDEO_DEVICE_INACTIVITY_DAYS = Number.parseInt(
  process.env.VIDEO_DEVICE_INACTIVITY_DAYS || '30',
  10
);
const VIDEO_DEVICE_INACTIVITY_DAYS =
  Number.isInteger(RAW_VIDEO_DEVICE_INACTIVITY_DAYS) && RAW_VIDEO_DEVICE_INACTIVITY_DAYS >= 1
    ? Math.min(RAW_VIDEO_DEVICE_INACTIVITY_DAYS, 365)
    : 30;
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
  if (typeof rawToken !== 'string' || !rawToken.includes('.')) return null;

  const [encodedPayload, signature] = rawToken.split('.');
  if (!encodedPayload || !signature) return null;

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

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function hashRequestValue(value) {
  if (typeof value !== 'string' || value.length === 0) return null;

  return createHmac('sha256', VIDEO_AUDIT_HASH_SECRET)
    .update(value)
    .digest('hex');
}

function sanitizeRangeHeader(value) {
  if (typeof value !== 'string' || value.length === 0) return null;

  const trimmed = value.trim();
  if (trimmed.length > 80) return 'too-long';
  if (!/^bytes=\d*-\d*(,\d*-\d*)?$/.test(trimmed)) return 'invalid';

  return trimmed;
}

function getPlaybackDeviceId(req) {
  const headerValue = req.headers['x-syc-device-id'];
  const rawDeviceId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof rawDeviceId !== 'string') return null;

  const deviceId = rawDeviceId.trim();
  return UUID_REGEX.test(deviceId) ? deviceId : null;
}

function getUserAgent(req) {
  return typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent']
    : '';
}

function getActiveDeviceCutoffIso() {
  return new Date(
    Date.now() - VIDEO_DEVICE_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
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

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

async function userHasPaidCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'paid')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function assertVideoDeviceAccess({ req, userId }) {
  const deviceId = getPlaybackDeviceId(req);
  if (!deviceId) {
    const error = new Error('Video device identifier is required.');
    error.status = 403;
    error.code = 'missing_device_id';
    throw error;
  }

  const deviceIdHash = hashRequestValue(deviceId);
  const userAgentHash = hashRequestValue(getUserAgent(req));

  const { data: existingDevice, error: existingDeviceError } = await supabase
    .from('user_video_devices')
    .select('id, revoked_at')
    .eq('user_id', userId)
    .eq('device_id_hash', deviceIdHash)
    .maybeSingle();

  if (existingDeviceError) throw existingDeviceError;

  if (existingDevice?.revoked_at) {
    const error = new Error('Video device has been revoked.');
    error.status = 403;
    error.code = 'device_revoked';
    throw error;
  }

  if (existingDevice) {
    const { error: updateError } = await supabase
      .from('user_video_devices')
      .update({
        user_agent_hash: userAgentHash,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existingDevice.id);

    if (updateError) throw updateError;
    return { deviceIdHash };
  }

  const { count, error: countError } = await supabase
    .from('user_video_devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gte('last_seen_at', getActiveDeviceCutoffIso());

  if (countError) throw countError;

  if ((count || 0) >= MAX_ACTIVE_VIDEO_DEVICES) {
    const error = new Error('User has reached the active video device limit.');
    error.status = 403;
    error.code = 'device_limit_exceeded';
    throw error;
  }

  const { error: insertError } = await supabase
    .from('user_video_devices')
    .insert({
      user_id: userId,
      device_id_hash: deviceIdHash,
      user_agent_hash: userAgentHash,
    });

  if (insertError) throw insertError;
  return { deviceIdHash };
}

async function assertPlaybackDeviceStillActive({ userId, deviceIdHash }) {
  if (!userId) return;

  if (!HASH_REGEX.test(deviceIdHash || '')) {
    const error = new Error('Playback token is missing a valid device hash.');
    error.status = 403;
    error.code = 'missing_token_device_hash';
    throw error;
  }

  const { data, error: deviceError } = await supabase
    .from('user_video_devices')
    .select('id, revoked_at')
    .eq('user_id', userId)
    .eq('device_id_hash', deviceIdHash)
    .maybeSingle();

  if (deviceError) throw deviceError;

  if (!data || data.revoked_at) {
    const error = new Error('Playback device is no longer active.');
    error.status = 403;
    error.code = 'playback_device_revoked';
    throw error;
  }
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseStorageReferenceFromPath(rawValue) {
  if (typeof rawValue !== 'string') return null;

  const value = rawValue.trim().replace(/^\/+/, '');
  if (!value) return null;

  const separatorIndex = value.indexOf(':');
  if (separatorIndex > 0) {
    const bucket = value.slice(0, separatorIndex).trim();
    const path = value.slice(separatorIndex + 1).trim().replace(/^\/+/, '');
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  if (value.startsWith(`${DEFAULT_VIDEO_BUCKET}/`)) {
    return {
      bucket: DEFAULT_VIDEO_BUCKET,
      path: value.slice(DEFAULT_VIDEO_BUCKET.length + 1),
    };
  }

  return { bucket: DEFAULT_VIDEO_BUCKET, path: value };
}

function parseStorageReferenceFromUrl(rawValue) {
  if (typeof rawValue !== 'string') return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    return null;
  }

  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  const objectSegmentIndex = segments.findIndex((segment, index) => {
    if (segment !== 'object') return false;
    const variant = segments[index + 1];
    return variant === 'public' || variant === 'authenticated' || variant === 'sign';
  });

  if (objectSegmentIndex === -1) return null;

  const bucket = segments[objectSegmentIndex + 2];
  const path = segments.slice(objectSegmentIndex + 3).join('/');

  if (!bucket || !path) return null;
  return { bucket, path };
}

function resolveStorageReference(videoStoragePath, videoUrl) {
  const fromPath = parseStorageReferenceFromPath(videoStoragePath);
  if (fromPath) return fromPath;

  const fromUrl = parseStorageReferenceFromUrl(videoUrl);
  if (fromUrl) return fromUrl;

  return null;
}

async function lessonBelongsToPublishedCourse(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select('is_published')
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.is_published);
}

async function getPlayableLesson(lessonId) {
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id, is_free_preview, is_published, video_url, video_storage_path')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError) throw lessonError;
  if (!lesson) {
    const error = new Error('Lesson not found.');
    error.status = 404;
    throw error;
  }

  if (!lesson.is_published) {
    const error = new Error('Lesson is not published.');
    error.status = 404;
    throw error;
  }

  const isPublishedCourse = await lessonBelongsToPublishedCourse(lesson.course_id);
  if (!isPublishedCourse) {
    const error = new Error('Parent course is not published.');
    error.status = 404;
    throw error;
  }

  return lesson;
}

async function assertLessonAccess({ lesson, user, req, enforceDevice = false }) {
  if (!lesson.is_free_preview) {
    if (!user) {
      const error = new Error('Authentication is required for this lesson.');
      error.status = 401;
      throw error;
    }

    const hasPaidAccess = await userHasPaidCourse(user.id, lesson.course_id);
    if (!hasPaidAccess) {
      const error = new Error('User does not have paid access to this lesson.');
      error.status = 403;
      throw error;
    }

    if (enforceDevice) {
      return assertVideoDeviceAccess({ req, userId: user.id });
    }
  }

  return null;
}

function isHlsManifestPath(objectPath) {
  return typeof objectPath === 'string' && objectPath.toLowerCase().endsWith('.m3u8');
}

function isExternalHlsUri(uri) {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith('//');
}

function getHlsRootDirectory(rootManifestPath) {
  const directory = path.posix.dirname(rootManifestPath);
  return directory === '.' ? '' : directory;
}

function normalizeHlsResourcePath(value) {
  if (typeof value !== 'string') return null;

  const resourcePath = value.trim().replace(/^\/+/, '');
  if (!resourcePath || isExternalHlsUri(resourcePath)) return null;

  const normalized = path.posix.normalize(resourcePath);
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
    return null;
  }

  return normalized;
}

function resolveHlsStorageReference(rootReference, resourcePath) {
  const normalizedResourcePath = normalizeHlsResourcePath(resourcePath);
  if (!normalizedResourcePath) return null;

  const rootDirectory = getHlsRootDirectory(rootReference.path);
  const objectPath = rootDirectory
    ? path.posix.join(rootDirectory, normalizedResourcePath)
    : normalizedResourcePath;

  if (rootDirectory && objectPath !== rootDirectory && !objectPath.startsWith(`${rootDirectory}/`)) {
    return null;
  }

  return {
    bucket: rootReference.bucket,
    path: objectPath,
  };
}

function getRelativeHlsPath(rootReference, objectPath) {
  const rootDirectory = getHlsRootDirectory(rootReference.path);
  if (!rootDirectory) return objectPath;
  if (objectPath === rootDirectory) return '';
  if (!objectPath.startsWith(`${rootDirectory}/`)) return null;
  return objectPath.slice(rootDirectory.length + 1);
}

function getHlsContentType(objectPath) {
  const extension = path.posix.extname(objectPath).toLowerCase();
  if (extension === '.m3u8') return 'application/vnd.apple.mpegurl';
  if (extension === '.ts') return 'video/mp2t';
  if (extension === '.m4s') return 'video/iso.segment';
  if (extension === '.mp4' || extension === '.m4v') return 'video/mp4';
  if (extension === '.vtt') return 'text/vtt; charset=utf-8';
  if (extension === '.key') return 'application/octet-stream';
  return 'application/octet-stream';
}

async function recordPlaybackEvent({
  req,
  lesson,
  lessonId,
  courseId,
  userId,
  tokenNonce,
  eventType,
  statusCode,
  errorCode,
}) {
  const { error } = await supabase
    .from('video_playback_events')
    .insert({
      user_id: userId || null,
      course_id: courseId || lesson?.course_id || null,
      lesson_id: lessonId || lesson?.id || null,
      token_nonce: tokenNonce || null,
      event_type: eventType,
      status_code: statusCode || null,
      request_ip_hash: hashRequestValue(getClientIp(req)),
      user_agent_hash: hashRequestValue(getUserAgent(req)),
      range_header: sanitizeRangeHeader(req.headers.range),
      error_code: errorCode || null,
    });

  if (error) throw error;
}

function recordPlaybackEventSafe(event) {
  recordPlaybackEvent(event).catch((error) => {
    console.warn('[Lesson Controller] Playback audit write failed:', error.message);
  });
}

function applyVideoSecurityHeaders(res) {
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Content-Type-Options', 'nosniff');
}

function copyHeader(sourceHeaders, targetResponse, sourceName, targetName = sourceName) {
  const value = sourceHeaders.get(sourceName);
  if (value) targetResponse.set(targetName, value);
}

async function createStorageSignedUrl(storageReference) {
  const { data, error } = await supabase.storage
    .from(storageReference.bucket)
    .createSignedUrl(storageReference.path, Math.min(SIGNED_URL_TTL_SECONDS, 300));

  if (error || !data?.signedUrl) {
    console.error(
      '[Lesson Controller] Error creating signed URL:',
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

function buildHlsResourceUrl(rawToken, resourcePath) {
  return `/api/lessons/hls/${encodeURIComponent(rawToken)}/resource?path=${encodeURIComponent(resourcePath)}`;
}

function resolveManifestUri({ rootReference, currentReference, uri }) {
  const trimmedUri = typeof uri === 'string' ? uri.trim() : '';
  if (!trimmedUri || isExternalHlsUri(trimmedUri)) return null;

  const rootDirectory = getHlsRootDirectory(rootReference.path);
  const currentDirectory = path.posix.dirname(currentReference.path);
  const safeCurrentDirectory = currentDirectory === '.' ? '' : currentDirectory;
  const objectPath = path.posix.normalize(
    safeCurrentDirectory ? path.posix.join(safeCurrentDirectory, trimmedUri) : trimmedUri
  );

  if (rootDirectory && objectPath !== rootDirectory && !objectPath.startsWith(`${rootDirectory}/`)) {
    return null;
  }

  if (objectPath.startsWith('../') || objectPath.includes('/../')) return null;

  return getRelativeHlsPath(rootReference, objectPath);
}

function rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken }) {
  return line.replace(/URI="([^"]+)"/g, (match, uri) => {
    const relativePath = resolveManifestUri({ rootReference, currentReference, uri });
    if (!relativePath) return match;

    return `URI="${buildHlsResourceUrl(rawToken, relativePath)}"`;
  });
}

function rewriteHlsManifest({ manifestText, rootReference, currentReference, rawToken }) {
  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      if (trimmedLine.startsWith('#')) {
        return rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken });
      }

      const relativePath = resolveManifestUri({
        rootReference,
        currentReference,
        uri: trimmedLine,
      });

      return relativePath ? buildHlsResourceUrl(rawToken, relativePath) : '# blocked external HLS URI';
    })
    .join('\n');
}

async function streamStorageObject({ req, res, storageReference, audit }) {
  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const upstreamResponse = await fetchStorageObject(storageReference, { rangeHeader });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    console.error('[Lesson Controller] Storage stream failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `storage_${upstreamResponse.status}`,
    });
    return res.status(502).json({ error: 'No se pudo cargar el video en este momento.' });
  }

  recordPlaybackEventSafe({
    ...audit,
    eventType: 'stream_started',
    statusCode: upstreamResponse.status,
  });

  applyVideoSecurityHeaders(res);
  res.status(upstreamResponse.status);
  copyHeader(upstreamResponse.headers, res, 'content-type', 'Content-Type');
  if (!upstreamResponse.headers.get('content-type')) {
    res.set('Content-Type', getHlsContentType(storageReference.path));
  }
  copyHeader(upstreamResponse.headers, res, 'content-length', 'Content-Length');
  copyHeader(upstreamResponse.headers, res, 'content-range', 'Content-Range');
  copyHeader(upstreamResponse.headers, res, 'etag', 'ETag');
  copyHeader(upstreamResponse.headers, res, 'last-modified', 'Last-Modified');

  if (!upstreamResponse.body) {
    return res.end();
  }

  return Readable.fromWeb(upstreamResponse.body).pipe(res);
}

async function getPlaybackContextFromToken({ req, rawToken }) {
  const payload = parsePlaybackToken(rawToken);
  if (!payload) {
    const error = new Error('Playback token is invalid or expired.');
    error.status = 401;
    error.code = 'invalid_or_expired_token';
    throw error;
  }

  assertPlaybackTokenRateLimit(payload.nonce);

  const lesson = await getPlayableLesson(payload.lessonId);
  const user = payload.userId ? { id: payload.userId } : null;
  await assertLessonAccess({ lesson, user, req });

  if (!lesson.is_free_preview) {
    await assertPlaybackDeviceStillActive({
      userId: payload.userId,
      deviceIdHash: payload.deviceIdHash,
    });
  }

  const rootReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
  if (!rootReference) {
    const error = new Error('Lesson storage reference is missing.');
    error.status = 500;
    error.code = 'missing_storage_reference';
    throw error;
  }

  return { payload, lesson, rootReference };
}

async function serveHlsObject({ req, res, rawToken, resourceReference, rootReference, currentReference, audit }) {
  const isManifest = isHlsManifestPath(resourceReference.path);
  const rangeHeader = !isManifest && typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const upstreamResponse = await fetchStorageObject(resourceReference, { rangeHeader });

  if (!upstreamResponse.ok) {
    console.error('[Lesson Controller] HLS storage fetch failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `hls_storage_${upstreamResponse.status}`,
    });
    return res.status(502).json({ error: 'No se pudo cargar el video en este momento.' });
  }

  recordPlaybackEventSafe({
    ...audit,
    eventType: 'stream_started',
    statusCode: upstreamResponse.status,
  });

  applyVideoSecurityHeaders(res);
  res.status(upstreamResponse.status);

  if (isManifest) {
    const manifestText = await upstreamResponse.text();
    const rewrittenManifest = rewriteHlsManifest({
      manifestText,
      rootReference,
      currentReference,
      rawToken,
    });
    res.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    return res.send(rewrittenManifest);
  }

  res.set('Content-Type', getHlsContentType(resourceReference.path));
  copyHeader(upstreamResponse.headers, res, 'content-length', 'Content-Length');
  copyHeader(upstreamResponse.headers, res, 'content-range', 'Content-Range');
  copyHeader(upstreamResponse.headers, res, 'etag', 'ETag');
  copyHeader(upstreamResponse.headers, res, 'last-modified', 'Last-Modified');

  if (!upstreamResponse.body) {
    return res.end();
  }

  return Readable.fromWeb(upstreamResponse.body).pipe(res);
}

exports.getLessonVideoUrl = async (req, res) => {
  try {
    const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId.trim() : '';
    if (!UUID_REGEX.test(lessonId)) {
      return res.status(400).json({ error: 'lessonId no es valido.' });
    }

    const user = await getAuthenticatedUser(req);
    const lesson = await getPlayableLesson(lessonId);
    const deviceAccess = await assertLessonAccess({ lesson, user, req, enforceDevice: true });

    const storageReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
    if (storageReference) {
      res.set('Cache-Control', 'no-store');
      const playbackToken = createPlaybackToken({
        lessonId: lesson.id,
        userId: user?.id || null,
        deviceIdHash: deviceAccess?.deviceIdHash || null,
      });
      recordPlaybackEventSafe({
        req,
        lesson,
        userId: user?.id || null,
        tokenNonce: playbackToken.nonce,
        eventType: 'token_issued',
        statusCode: 200,
      });

      if (isHlsManifestPath(storageReference.path)) {
        return res.json({
          path: `/api/lessons/hls/${encodeURIComponent(playbackToken.token)}/manifest`,
          expiresInSeconds: PLAYBACK_TOKEN_TTL_SECONDS,
          source: 'hls',
        });
      }

      return res.json({
        path: `/api/lessons/playback/${encodeURIComponent(playbackToken.token)}`,
        expiresInSeconds: PLAYBACK_TOKEN_TTL_SECONDS,
        source: 'proxied',
      });
    }

    if (lesson.is_free_preview && isHttpUrl(lesson.video_url)) {
      res.set('Cache-Control', 'no-store');
      return res.json({
        url: lesson.video_url,
        expiresInSeconds: null,
        source: 'public_preview',
      });
    }

    return res
      .status(500)
      .json({ error: 'El video de esta leccion no esta configurado de forma segura.' });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error resolving lesson video:', err.message);
    recordPlaybackEventSafe({
      req,
      lessonId: UUID_REGEX.test(req.params.lessonId || '') ? req.params.lessonId : null,
      eventType: status === 401 || status === 403 || status === 429 ? 'token_denied' : 'stream_error',
      statusCode: status,
      errorCode: err.code || 'video_token_failed',
    });
    return res.status(status).json({ error: 'No se pudo resolver el acceso al video.' });
  }
};

exports.serveHlsManifest = async (req, res) => {
  let context = null;

  try {
    const rawToken = req.params.token;
    context = await getPlaybackContextFromToken({ req, rawToken });

    if (!isHlsManifestPath(context.rootReference.path)) {
      return res.status(400).json({ error: 'El video no esta configurado como HLS.' });
    }

    return serveHlsObject({
      req,
      res,
      rawToken,
      resourceReference: context.rootReference,
      rootReference: context.rootReference,
      currentReference: context.rootReference,
      audit: {
        req,
        lesson: context.lesson,
        userId: context.payload.userId,
        tokenNonce: context.payload.nonce,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error serving HLS manifest:', err.message);
    recordPlaybackEventSafe({
      req,
      lesson: context?.lesson || null,
      lessonId: context?.payload?.lessonId || null,
      userId: context?.payload?.userId || null,
      tokenNonce: context?.payload?.nonce || null,
      eventType: status === 401 || status === 403 || status === 429 ? 'stream_denied' : 'stream_error',
      statusCode: status,
      errorCode: err.code || 'hls_manifest_failed',
    });
    return res.status(status).json({ error: 'No se pudo cargar el video en este momento.' });
  }
};

exports.serveHlsResource = async (req, res) => {
  let context = null;

  try {
    const rawToken = req.params.token;
    context = await getPlaybackContextFromToken({ req, rawToken });

    if (!isHlsManifestPath(context.rootReference.path)) {
      return res.status(400).json({ error: 'El video no esta configurado como HLS.' });
    }

    const requestedPath = typeof req.query.path === 'string' ? req.query.path : '';
    const resourceReference = resolveHlsStorageReference(context.rootReference, requestedPath);
    if (!resourceReference) {
      return res.status(400).json({ error: 'Recurso de video no valido.' });
    }

    return serveHlsObject({
      req,
      res,
      rawToken,
      resourceReference,
      rootReference: context.rootReference,
      currentReference: resourceReference,
      audit: {
        req,
        lesson: context.lesson,
        userId: context.payload.userId,
        tokenNonce: context.payload.nonce,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error serving HLS resource:', err.message);
    recordPlaybackEventSafe({
      req,
      lesson: context?.lesson || null,
      lessonId: context?.payload?.lessonId || null,
      userId: context?.payload?.userId || null,
      tokenNonce: context?.payload?.nonce || null,
      eventType: status === 401 || status === 403 || status === 429 ? 'stream_denied' : 'stream_error',
      statusCode: status,
      errorCode: err.code || 'hls_resource_failed',
    });
    return res.status(status).json({ error: 'No se pudo cargar el video en este momento.' });
  }
};

exports.streamLessonVideo = async (req, res) => {
  let payload = null;
  let lesson = null;

  try {
    payload = parsePlaybackToken(req.params.token);
    if (!payload) {
      recordPlaybackEventSafe({
        req,
        eventType: 'stream_denied',
        statusCode: 401,
        errorCode: 'invalid_or_expired_token',
      });
      return res.status(401).json({ error: 'Acceso de video no valido o caducado.' });
    }

    assertPlaybackTokenRateLimit(payload.nonce);

    lesson = await getPlayableLesson(payload.lessonId);
    const user = payload.userId ? { id: payload.userId } : null;
    await assertLessonAccess({ lesson, user, req });
    if (!lesson.is_free_preview) {
      await assertPlaybackDeviceStillActive({
        userId: payload.userId,
        deviceIdHash: payload.deviceIdHash,
      });
    }

    const storageReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
    if (!storageReference) {
      recordPlaybackEventSafe({
        req,
        lesson,
        userId: payload.userId,
        tokenNonce: payload.nonce,
        eventType: 'stream_error',
        statusCode: 500,
        errorCode: 'missing_storage_reference',
      });
      return res.status(500).json({ error: 'El video de esta leccion no esta configurado de forma segura.' });
    }

    return streamStorageObject({
      req,
      res,
      storageReference,
      audit: {
        req,
        lesson,
        userId: payload.userId,
        tokenNonce: payload.nonce,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error streaming lesson video:', err.message);
    recordPlaybackEventSafe({
      req,
      lesson,
      lessonId: payload?.lessonId || null,
      userId: payload?.userId || null,
      tokenNonce: payload?.nonce || null,
      eventType: status === 401 || status === 403 || status === 429 ? 'stream_denied' : 'stream_error',
      statusCode: status,
      errorCode: status === 429 ? 'rate_limited' : 'playback_access_failed',
    });
    return res.status(status).json({ error: 'No se pudo cargar el video en este momento.' });
  }
};
