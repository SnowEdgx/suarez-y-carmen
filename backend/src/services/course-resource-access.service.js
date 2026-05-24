const { supabase } = require('../config/supabase');
const {
  resolveResourceStorageReference,
} = require('./resource-storage.service');
const {
  COURSE_RESOURCE_TOKEN_TTL_SECONDS,
  createCourseResourceToken,
} = require('./course-resource-token.service');

function isSafeExternalUrl(value) {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

async function courseIsPublished(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select('is_published')
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.is_published);
}

async function getPublishedCourseResource(resourceId) {
  const { data: resource, error } = await supabase
    .from('course_resources')
    .select('id, course_id, is_free_preview, is_published, resource_url, resource_storage_path')
    .eq('id', resourceId)
    .maybeSingle();

  if (error) throw error;
  if (!resource || !resource.is_published) {
    const notFound = new Error('Course resource not found.');
    notFound.status = 404;
    throw notFound;
  }

  const publishedCourse = await courseIsPublished(resource.course_id);
  if (!publishedCourse) {
    const notFound = new Error('Parent course is not published.');
    notFound.status = 404;
    throw notFound;
  }

  return resource;
}

async function assertCourseResourceAccess({ resource, user }) {
  if (resource.is_free_preview) return;

  if (!user) {
    const error = new Error('Authentication is required for this resource.');
    error.status = 401;
    error.code = 'authentication_required';
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(user, 'email_confirmed_at') && !user.email_confirmed_at) {
    const error = new Error('Verified email is required for this resource.');
    error.status = 403;
    error.code = 'email_not_verified';
    throw error;
  }

  const hasPaidAccess = await userHasPaidCourse(user.id, resource.course_id);
  if (!hasPaidAccess) {
    const error = new Error('User does not have paid access to this course resource.');
    error.status = 403;
    error.code = 'course_not_purchased';
    throw error;
  }
}

async function resolveCourseResourceAccess({ resourceId, user }) {
  const resource = await getPublishedCourseResource(resourceId);
  await assertCourseResourceAccess({ resource, user });

  const storageReference = resolveResourceStorageReference(resource.resource_storage_path);
  if (storageReference) {
    const resourceToken = createCourseResourceToken({
      resourceId: resource.id,
      storageReference,
      userId: user?.id || null,
    });

    return {
      path: `/api/course-resources/view/${encodeURIComponent(resourceToken.token)}`,
      expiresInSeconds: COURSE_RESOURCE_TOKEN_TTL_SECONDS,
      source: 'protected_resource',
    };
  }

  if (resource.is_free_preview && isSafeExternalUrl(resource.resource_url)) {
    return {
      url: resource.resource_url,
      expiresInSeconds: null,
      source: 'external_url',
    };
  }

  const error = new Error('Course resource file reference is missing.');
  error.status = 500;
  error.code = 'resource_unavailable';
  throw error;
}

async function assertCourseResourceStreamAccess(payload) {
  const resource = await getPublishedCourseResource(payload.resourceId);
  const currentStorageReference = resolveResourceStorageReference(resource.resource_storage_path);

  if (
    !currentStorageReference ||
    currentStorageReference.bucket !== payload.storageReference.bucket ||
    currentStorageReference.path !== payload.storageReference.path
  ) {
    const error = new Error('Course resource token no longer matches the current storage object.');
    error.status = 404;
    error.code = 'resource_unavailable';
    throw error;
  }

  if (resource.is_free_preview) return;

  if (!payload.userId) {
    const error = new Error('Authentication is required for this protected resource stream.');
    error.status = 401;
    error.code = 'authentication_required';
    throw error;
  }

  const hasPaidAccess = await userHasPaidCourse(payload.userId, resource.course_id);
  if (!hasPaidAccess) {
    const error = new Error('User no longer has paid access to this course resource.');
    error.status = 403;
    error.code = 'course_not_purchased';
    throw error;
  }
}

function getSafeResourceAccessCode(err) {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (
    [
      'authentication_required',
      'email_not_verified',
      'course_not_purchased',
      'resource_rate_limited',
    ].includes(code)
  ) {
    return code;
  }

  if (err?.status === 401) return 'authentication_required';
  if (err?.status === 403) return 'access_denied';
  return 'resource_unavailable';
}

module.exports = {
  assertCourseResourceStreamAccess,
  getSafeResourceAccessCode,
  resolveCourseResourceAccess,
};
