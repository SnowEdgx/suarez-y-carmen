const { createHmac, randomUUID, timingSafeEqual } = require('crypto');
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

function createPlaybackToken({ lessonId, userId }) {
  const payload = {
    lessonId,
    userId: userId || null,
    exp: Math.floor(Date.now() / 1000) + PLAYBACK_TOKEN_TTL_SECONDS,
    nonce: randomUUID(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPlaybackPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
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
    if (payload.userId !== null && !UUID_REGEX.test(payload.userId)) return null;
    if (!Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

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

async function assertLessonAccess({ lesson, user }) {
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
  }
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

async function streamStorageObject({ req, res, storageReference }) {
  const signedUrl = await createStorageSignedUrl(storageReference);
  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const upstreamResponse = await fetch(signedUrl, {
    headers: rangeHeader ? { Range: rangeHeader } : {},
  });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    console.error('[Lesson Controller] Storage stream failed:', upstreamResponse.status);
    return res.status(502).json({ error: 'No se pudo cargar el video en este momento.' });
  }

  applyVideoSecurityHeaders(res);
  res.status(upstreamResponse.status);
  copyHeader(upstreamResponse.headers, res, 'content-type', 'Content-Type');
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
    await assertLessonAccess({ lesson, user });

    const storageReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
    if (storageReference) {
      res.set('Cache-Control', 'no-store');
      const playbackToken = createPlaybackToken({ lessonId: lesson.id, userId: user?.id || null });
      return res.json({
        path: `/api/lessons/playback/${encodeURIComponent(playbackToken)}`,
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
    return res.status(status).json({ error: 'No se pudo resolver el acceso al video.' });
  }
};

exports.streamLessonVideo = async (req, res) => {
  try {
    const payload = parsePlaybackToken(req.params.token);
    if (!payload) {
      return res.status(401).json({ error: 'Acceso de video no valido o caducado.' });
    }

    const lesson = await getPlayableLesson(payload.lessonId);
    const user = payload.userId ? { id: payload.userId } : null;
    await assertLessonAccess({ lesson, user });

    const storageReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
    if (!storageReference) {
      return res.status(500).json({ error: 'El video de esta leccion no esta configurado de forma segura.' });
    }

    return streamStorageObject({ req, res, storageReference });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Lesson Controller] Error streaming lesson video:', err.message);
    return res.status(status).json({ error: 'No se pudo cargar el video en este momento.' });
  }
};
