const { supabase } = require('../../config/supabase');
const { assertFallbackOwnership } = require('./identity');
const { optionalString } = require('./validation');

function getCmsDocumentId(entry) {
  return optionalString(entry.cmsDocumentId, 255);
}

async function findByCmsDocumentId(table, entry, select = 'id, cms_document_id') {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (!cmsDocumentId) return null;

  const result = await supabase
    .from(table)
    .select(select)
    .eq('cms_document_id', cmsDocumentId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data || null;
}

async function findCourse(entry, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('courses')
      .select('id, cms_document_id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  if (options.allowFallback === false) return null;

  const slug = optionalString(entry.slug, 160);
  if (!slug) return null;

  const bySlug = await supabase
    .from('courses')
    .select('id, cms_document_id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (bySlug.error) throw bySlug.error;
  return assertFallbackOwnership(bySlug.data, cmsDocumentId, 'Course', `slug "${slug.toLowerCase()}"`);
}

async function findCourseByReference(entry, options = {}) {
  const courseDocumentId = optionalString(entry.courseDocumentId, 255);
  if (courseDocumentId) {
    const byDocumentId = await supabase
      .from('courses')
      .select('id, cms_document_id')
      .eq('cms_document_id', courseDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  if (options.allowFallback === false) return null;

  const courseSlug = optionalString(entry.courseSlug, 160);
  if (courseSlug) {
    const bySlug = await supabase
      .from('courses')
      .select('id, cms_document_id')
      .eq('slug', courseSlug.toLowerCase())
      .maybeSingle();
    if (bySlug.error) throw bySlug.error;
    if (bySlug.data) {
      return assertFallbackOwnership(
        bySlug.data,
        courseDocumentId,
        'Course reference',
        `slug "${courseSlug.toLowerCase()}"`
      );
    }
  }

  return null;
}

async function findLesson(entry, courseId, position, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('lessons')
      .select('id, cms_document_id, video_storage_path, video_url')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  if (options.allowFallback === false || !courseId || !Number.isInteger(position)) return null;

  const byPosition = await supabase
    .from('lessons')
    .select('id, cms_document_id, video_storage_path, video_url')
    .eq('course_id', courseId)
    .eq('position', position)
    .limit(1)
    .maybeSingle();
  if (byPosition.error) throw byPosition.error;
  return assertFallbackOwnership(byPosition.data, cmsDocumentId, 'Lesson', `course position ${position}`);
}

async function findCourseResource(entry, courseId, position, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('course_resources')
      .select('id, cms_document_id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  if (options.allowFallback === false || !courseId) return null;

  const title = optionalString(entry.title, 255);
  if (!title) return null;

  let query = supabase
    .from('course_resources')
    .select('id, cms_document_id')
    .eq('course_id', courseId)
    .eq('title', title);

  if (Number.isInteger(position)) {
    query = query.eq('position', position);
  }

  const byTitle = await query.limit(1).maybeSingle();
  if (byTitle.error) throw byTitle.error;
  return assertFallbackOwnership(byTitle.data, cmsDocumentId, 'Course resource', `title "${title}"`);
}

async function findEvent(entry, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  if (cmsDocumentId) {
    const byDocumentId = await supabase
      .from('events')
      .select('id, cms_document_id')
      .eq('cms_document_id', cmsDocumentId)
      .maybeSingle();
    if (byDocumentId.error) throw byDocumentId.error;
    if (byDocumentId.data) return byDocumentId.data;
  }

  if (options.allowFallback === false) return null;

  const title = optionalString(entry.title, 255);
  const eventDate = optionalString(entry.eventDate, 80);
  if (!title || !eventDate) return null;

  const byTitleAndDate = await supabase
    .from('events')
    .select('id, cms_document_id')
    .eq('title', title)
    .eq('event_date', new Date(eventDate).toISOString())
    .maybeSingle();
  if (byTitleAndDate.error) throw byTitleAndDate.error;
  return assertFallbackOwnership(byTitleAndDate.data, cmsDocumentId, 'Event', `title/date "${title}"`);
}

async function findFaq(entry, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  const byDocumentId = await findByCmsDocumentId('faqs', entry);
  if (byDocumentId) return byDocumentId;

  if (options.allowFallback === false) return null;

  const question = optionalString(entry.question, 255);
  if (!question) return null;

  const byQuestion = await supabase
    .from('faqs')
    .select('id, cms_document_id')
    .eq('question', question)
    .maybeSingle();
  if (byQuestion.error) throw byQuestion.error;
  return assertFallbackOwnership(byQuestion.data, cmsDocumentId, 'FAQ', `question "${question}"`);
}

async function findInPersonClass(entry, options = {}) {
  const cmsDocumentId = getCmsDocumentId(entry);
  const byDocumentId = await findByCmsDocumentId('in_person_classes', entry);
  if (byDocumentId) return byDocumentId;

  if (options.allowFallback === false) return null;

  const title = optionalString(entry.title, 255);
  if (!title) return null;

  let query = supabase
    .from('in_person_classes')
    .select('id, cms_document_id')
    .eq('title', title);

  const city = optionalString(entry.city, 255);
  if (city) query = query.eq('city', city);

  const byTitle = await query.limit(1).maybeSingle();
  if (byTitle.error) throw byTitle.error;
  return assertFallbackOwnership(byTitle.data, cmsDocumentId, 'In-person class', `title "${title}"`);
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
