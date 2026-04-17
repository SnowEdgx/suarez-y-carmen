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

exports.getLessonVideoUrl = async (req, res) => {
  try {
    const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId.trim() : '';
    if (!UUID_REGEX.test(lessonId)) {
      return res.status(400).json({ error: 'lessonId no es valido.' });
    }

    const user = await getAuthenticatedUser(req);

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, course_id, is_free_preview, video_url, video_storage_path')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson) {
      return res.status(404).json({ error: 'Leccion no encontrada.' });
    }

    const isPublishedCourse = await lessonBelongsToPublishedCourse(lesson.course_id);
    if (!isPublishedCourse) {
      return res.status(404).json({ error: 'Leccion no disponible.' });
    }

    if (!lesson.is_free_preview) {
      if (!user) {
        return res.status(401).json({ error: 'No autorizado. Inicia sesion para acceder al video.' });
      }

      const hasPaidAccess = await userHasPaidCourse(user.id, lesson.course_id);
      if (!hasPaidAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta leccion.' });
      }
    }

    const storageReference = resolveStorageReference(lesson.video_storage_path, lesson.video_url);
    if (storageReference) {
      const { data, error } = await supabase.storage
        .from(storageReference.bucket)
        .createSignedUrl(storageReference.path, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        console.error(
          '[Lesson Controller] Error creating signed URL:',
          error?.message || 'unknown storage error'
        );
        return res.status(500).json({ error: 'No se pudo firmar el acceso al video.' });
      }

      res.set('Cache-Control', 'no-store');
      return res.json({
        url: data.signedUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        source: 'signed',
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
