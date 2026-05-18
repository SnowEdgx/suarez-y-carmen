const { supabase } = require('../../config/supabase');
const { optionalString } = require('./validation');

async function findByCmsDocumentId(table, entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (!cmsDocumentId) return null;

  const result = await supabase
    .from(table)
    .select('id')
    .eq('cms_document_id', cmsDocumentId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data || null;
}

async function findCourse(entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('courses')
      .select('id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  const slug = optionalString(entry.slug, 160);
  if (!slug) return null;

  const bySlug = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (bySlug.error) throw bySlug.error;
  return bySlug.data || null;
}

async function findCourseByReference(entry) {
  const courseDocumentId = optionalString(entry.courseDocumentId, 255);
  if (courseDocumentId) {
    const byDocumentId = await supabase
      .from('courses')
      .select('id')
      .eq('cms_document_id', courseDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  const courseSlug = optionalString(entry.courseSlug, 160);
  if (courseSlug) {
    const bySlug = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseSlug.toLowerCase())
      .maybeSingle();
    if (bySlug.error) throw bySlug.error;
    if (bySlug.data) return bySlug.data;
  }

  return null;
}

async function findLesson(entry, courseId, position) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('lessons')
      .select('id, video_storage_path, video_url')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  const byPosition = await supabase
    .from('lessons')
    .select('id, video_storage_path, video_url')
    .eq('course_id', courseId)
    .eq('position', position)
    .limit(1)
    .maybeSingle();
  if (byPosition.error) throw byPosition.error;
  return byPosition.data || null;
}

async function findCourseResource(entry, courseId, position) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('course_resources')
      .select('id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  const title = optionalString(entry.title, 255);
  if (!title) return null;

  let query = supabase
    .from('course_resources')
    .select('id')
    .eq('course_id', courseId)
    .eq('title', title);

  if (Number.isInteger(position)) {
    query = query.eq('position', position);
  }

  const byTitle = await query.limit(1).maybeSingle();
  if (byTitle.error) throw byTitle.error;
  return byTitle.data || null;
}

async function findEvent(entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('events')
      .select('id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  const title = optionalString(entry.title, 255);
  const eventDate = optionalString(entry.eventDate, 80);
  if (!title || !eventDate) return null;

  const byTitleAndDate = await supabase
    .from('events')
    .select('id')
    .eq('title', title)
    .eq('event_date', new Date(eventDate).toISOString())
    .maybeSingle();
  if (byTitleAndDate.error) throw byTitleAndDate.error;
  return byTitleAndDate.data || null;
}

async function findFaq(entry) {
  const byDocumentId = await findByCmsDocumentId('faqs', entry);
  if (byDocumentId) return byDocumentId;

  const question = optionalString(entry.question, 255);
  if (!question) return null;

  const byQuestion = await supabase
    .from('faqs')
    .select('id')
    .eq('question', question)
    .maybeSingle();
  if (byQuestion.error) throw byQuestion.error;
  return byQuestion.data || null;
}

async function findInPersonClass(entry) {
  const byDocumentId = await findByCmsDocumentId('in_person_classes', entry);
  if (byDocumentId) return byDocumentId;

  const title = optionalString(entry.title, 255);
  if (!title) return null;

  let query = supabase
    .from('in_person_classes')
    .select('id')
    .eq('title', title);

  const city = optionalString(entry.city, 255);
  if (city) query = query.eq('city', city);

  const byTitle = await query.limit(1).maybeSingle();
  if (byTitle.error) throw byTitle.error;
  return byTitle.data || null;
}

module.exports = {
  findCourse,
  findCourseByReference,
  findCourseResource,
  findEvent,
  findFaq,
  findInPersonClass,
  findLesson,
};
