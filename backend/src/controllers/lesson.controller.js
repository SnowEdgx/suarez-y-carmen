const { getAuthenticatedUser } = require('../utils/auth');
const { UUID_REGEX } = require('../utils/validation');
const {
  PLAYBACK_TOKEN_TTL_SECONDS,
  createPlaybackToken,
} = require('../services/playback-token.service');
const {
  assertHlsRootDirectory,
  isHlsManifestPath,
  isHttpUrl,
  resolveHlsStorageReference,
  resolveStorageReference,
} = require('../services/video-storage.service');
const {
  assertLessonAccess,
  getPlaybackContextFromToken,
  getPlayableLesson,
  getSafeVideoAccessCode,
} = require('../services/lesson-playback.service');
const { recordPlaybackEventSafe } = require('../services/playback-audit.service');
const {
  sendVideoUnavailable,
  serveHlsObject,
  streamStorageObject,
} = require('../services/video-response.service');

exports.getLessonVideoUrl = async (req, res) => {
  let lesson = null;

  try {
    const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId.trim() : '';
    if (!UUID_REGEX.test(lessonId)) {
      return res.status(400).json({ error: 'lessonId no es válido.' });
    }

    const user = await getAuthenticatedUser(req);
    lesson = await getPlayableLesson(lessonId);
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

    console.error('[Lesson Controller] Lesson storage reference is missing:', lesson.id);
    return sendVideoUnavailable(res, 500);
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error resolving lesson video:', err.message);
    recordPlaybackEventSafe({
      req,
      lesson,
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
      return res.status(400).json({ error: 'Solicitud de vídeo no válida.' });
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
    return sendVideoUnavailable(res, status);
  }
};

exports.serveHlsResource = async (req, res) => {
  let context = null;

  try {
    const rawToken = req.params.token;
    context = await getPlaybackContextFromToken({ req, rawToken });

    if (!isHlsManifestPath(context.rootReference.path)) {
      return res.status(400).json({ error: 'Solicitud de vídeo no válida.' });
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
    return sendVideoUnavailable(res, status);
  }
};

exports.streamLessonVideo = async (req, res) => {
  let context = null;

  try {
    context = await getPlaybackContextFromToken({ req, rawToken: req.params.token });

    return await streamStorageObject({
      req,
      res,
      storageReference: context.rootReference,
      audit: {
        req,
        lesson: context.lesson,
        userId: context.payload.userId,
        tokenNonce: context.payload.nonce,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error streaming lesson video:', err.message);
    recordPlaybackEventSafe({
      req,
      lesson: context?.lesson || null,
      lessonId: context?.payload?.lessonId || null,
      userId: context?.payload?.userId || null,
      tokenNonce: context?.payload?.nonce || null,
      eventType: status === 401 || status === 403 || status === 429 ? 'stream_denied' : 'stream_error',
      statusCode: status,
      errorCode: err.code || (status === 429 ? 'rate_limited' : 'playback_access_failed'),
    });

    if (err.code === 'invalid_or_expired_token') {
      return res.status(401).json({ error: 'Acceso de vídeo no válido o caducado.' });
    }

    return sendVideoUnavailable(res, status);
  }
};
