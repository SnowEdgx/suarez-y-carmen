const { Readable } = require('stream');
const { supabase } = require('../config/supabase');
const { getAuthenticatedUser } = require('../utils/auth');
const { getForwardableRangeHeader } = require('../utils/range-header');
const { UUID_REGEX } = require('../utils/validation');
const {
  assertPlaybackDeviceStillActive,
  assertVideoDeviceAccess,
} = require('../services/video-device.service');
const {
  PLAYBACK_TOKEN_TTL_SECONDS,
  assertPlaybackTokenRateLimit,
  createPlaybackToken,
  parsePlaybackToken,
} = require('../services/playback-token.service');
const {
  assertHlsRootDirectory,
  fetchStorageObject,
  getHlsContentType,
  isHlsManifestPath,
  isHttpUrl,
  resolveHlsStorageReference,
  resolveStorageReference,
  rewriteHlsManifest,
} = require('../services/video-storage.service');
const { recordPlaybackEventSafe } = require('../services/playback-audit.service');

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
      error.code = 'authentication_required';
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(user, 'email_confirmed_at') && !user.email_confirmed_at) {
      const error = new Error('Verified email is required for this lesson.');
      error.status = 403;
      error.code = 'email_not_verified';
      throw error;
    }

    const hasPaidAccess = await userHasPaidCourse(user.id, lesson.course_id);
    if (!hasPaidAccess) {
      const error = new Error('User does not have paid access to this lesson.');
      error.status = 403;
      error.code = 'course_not_purchased';
      throw error;
    }

    if (enforceDevice) {
      return assertVideoDeviceAccess({ req, userId: user.id });
    }
  }

  return null;
}

function getSafeVideoAccessCode(err) {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (
    [
      'authentication_required',
      'email_not_verified',
      'course_not_purchased',
      'missing_device_id',
      'device_revoked',
      'device_limit_exceeded',
      'playback_device_revoked',
      'playback_rate_limited',
    ].includes(code)
  ) {
    return code;
  }

  if (err?.status === 401) return 'authentication_required';
  if (err?.status === 403) return 'access_denied';
  if (err?.status === 429) return 'playback_rate_limited';
  return 'video_unavailable';
}

function applyVideoSecurityHeaders(res) {
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set(
    'Access-Control-Expose-Headers',
    'Accept-Ranges, Content-Length, Content-Range, Content-Type'
  );
}

function copyHeader(sourceHeaders, targetResponse, sourceName, targetName = sourceName) {
  const value = sourceHeaders.get(sourceName);
  if (value) targetResponse.set(targetName, value);
}

async function streamStorageObject({ req, res, storageReference, audit }) {
  const rangeHeader = getForwardableRangeHeader(req);
  const upstreamResponse = await fetchStorageObject(storageReference, { rangeHeader });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    console.error('[Lesson Controller] Storage stream failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `storage_${upstreamResponse.status}`,
    });
    return res.status(502).json({ error: 'No se pudo cargar el vídeo en este momento.' });
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
  if (isHlsManifestPath(rootReference.path)) {
    assertHlsRootDirectory(rootReference);
  }

  return { payload, lesson, rootReference };
}

async function serveHlsObject({ req, res, rawToken, resourceReference, rootReference, currentReference, audit }) {
  const isManifest = isHlsManifestPath(resourceReference.path);
  const rangeHeader = !isManifest ? getForwardableRangeHeader(req) : undefined;
  const upstreamResponse = await fetchStorageObject(resourceReference, { rangeHeader });

  if (!upstreamResponse.ok) {
    console.error('[Lesson Controller] HLS storage fetch failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `hls_storage_${upstreamResponse.status}`,
    });
    return res.status(502).json({ error: 'No se pudo cargar el vídeo en este momento.' });
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
      return res.status(400).json({ error: 'lessonId no es válido.' });
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
        assertHlsRootDirectory(storageReference);
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
      .json({ error: 'El vídeo de esta lección no está configurado de forma segura.' });
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
    return res.status(status).json({
      error: 'No se pudo resolver el acceso al vídeo.',
      code: getSafeVideoAccessCode(err),
    });
  }
};

exports.serveHlsManifest = async (req, res) => {
  let context = null;

  try {
    const rawToken = req.params.token;
    context = await getPlaybackContextFromToken({ req, rawToken });

    if (!isHlsManifestPath(context.rootReference.path)) {
      return res.status(400).json({ error: 'El vídeo no está configurado como HLS.' });
    }

    return await serveHlsObject({
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
    return res.status(status).json({ error: 'No se pudo cargar el vídeo en este momento.' });
  }
};

exports.serveHlsResource = async (req, res) => {
  let context = null;

  try {
    const rawToken = req.params.token;
    context = await getPlaybackContextFromToken({ req, rawToken });

    if (!isHlsManifestPath(context.rootReference.path)) {
      return res.status(400).json({ error: 'El vídeo no está configurado como HLS.' });
    }

    const requestedPath = typeof req.query.path === 'string' ? req.query.path : '';
    const resourceReference = resolveHlsStorageReference(context.rootReference, requestedPath);
    if (!resourceReference) {
      return res.status(400).json({ error: 'Recurso de vídeo no válido.' });
    }

    return await serveHlsObject({
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
    return res.status(status).json({ error: 'No se pudo cargar el vídeo en este momento.' });
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
      return res.status(401).json({ error: 'Acceso de vídeo no válido o caducado.' });
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
      return res.status(500).json({ error: 'El vídeo de esta lección no está configurado de forma segura.' });
    }

    return await streamStorageObject({
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
      errorCode: err.code || (status === 429 ? 'rate_limited' : 'playback_access_failed'),
    });
    return res.status(status).json({ error: 'No se pudo cargar el vídeo en este momento.' });
  }
};
