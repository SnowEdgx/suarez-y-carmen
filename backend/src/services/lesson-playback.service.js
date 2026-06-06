const { supabase } = require('../config/supabase');
const {
  assertCourseIsPublished,
  userHasPaidCourse,
} = require('./course-access.service');
const {
  assertPlaybackDeviceStillActive,
  assertVideoDeviceAccess,
} = require('./video-device.service');
const {
  assertPlaybackTokenRateLimit,
  parsePlaybackToken,
} = require('./playback-token.service');
const {
  assertHlsRootDirectory,
  isHlsManifestPath,
  resolveStorageReference,
} = require('./video-storage.service');

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

  await assertCourseIsPublished(lesson.course_id);

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

module.exports = {
  assertLessonAccess,
  getPlaybackContextFromToken,
  getPlayableLesson,
  getSafeVideoAccessCode,
};
