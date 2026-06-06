const { supabase } = require('../config/supabase');

async function userHasPaidCourse(userId, courseId) {
  if (!userId || !courseId) return false;

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

async function isCoursePublished(courseId) {
  if (!courseId) return false;

  const { data, error } = await supabase
    .from('courses')
    .select('is_published')
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.is_published);
}

async function assertCourseIsPublished(courseId) {
  const publishedCourse = await isCoursePublished(courseId);
  if (publishedCourse) return;

  const notFound = new Error('Parent course is not published.');
  notFound.status = 404;
  throw notFound;
}

module.exports = {
  assertCourseIsPublished,
  isCoursePublished,
  userHasPaidCourse,
};
