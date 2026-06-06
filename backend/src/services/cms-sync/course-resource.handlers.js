const { supabase } = require('../../config/supabase');
const {
  assertSupabase,
  createHttpError,
  normalizeResourceStoragePath,
  normalizeUrl,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findCourseByReference, findCourseResource } = require('./finders');
const { assertNoPublishedPositionConflict } = require('./position-integrity');

async function upsertCourseResource(entry) {
  const course = await findCourseByReference(entry);
  if (!course?.id) {
    throw createHttpError(422, 'Linked course could not be found in Supabase.');
  }

  const title = requiredString(entry.title, 'title', 255);
  const position = optionalInteger(entry.position, 'position', { min: 0, max: 1000 }) ?? 0;
  const resourceStoragePath = normalizeResourceStoragePath(entry.resourceStoragePath);
  const resourceUrl = normalizeUrl(entry.resourceUrl, 'resourceUrl');
  if (!resourceStoragePath && !resourceUrl) {
    throw createHttpError(422, 'resourceStoragePath or resourceUrl is required.');
  }
  const isFreePreview = optionalBoolean(entry.isFreePreview) ?? false;
  if (!isFreePreview && !resourceStoragePath) {
    throw createHttpError(422, 'Paid course resources must use a private resourceStoragePath.');
  }

  const existing = await findCourseResource(entry, course.id, position);
  const isPublished = resolvePublishedState(entry);

  if (isPublished) {
    await assertNoPublishedPositionConflict({
      table: 'course_resources',
      entityName: 'Course resource',
      courseId: course.id,
      position,
      currentId: existing?.id,
    });
  }

  const payload = {
    course_id: course.id,
    title,
    description: optionalString(entry.description, 10000),
    resource_url: resourceUrl,
    resource_storage_path: resourceStoragePath,
    file_name: optionalString(entry.fileName, 255),
    mime_type: optionalString(entry.mimeType, 120),
    position,
    is_free_preview: isFreePreview,
    is_published: isPublished,
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('course_resources').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('course_resources').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync course resource');
}

async function unpublishCourseResource(entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const existingByDocumentId = await findCourseResource(entry, null, null, { allowFallback: false });
    if (!existingByDocumentId?.id) return { id: null, skipped: true };

    const result = await supabase
      .from('course_resources')
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq('id', existingByDocumentId.id)
      .select('id')
      .single();

    return assertSupabase(result, 'Could not unpublish course resource');
  }

  const course = await findCourseByReference(entry);
  if (!course?.id) return { id: null, skipped: true };

  const position = optionalInteger(entry.position, 'position', { min: 0, max: 1000 }) ?? null;
  const existing = await findCourseResource(entry, course.id, position);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('course_resources')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish course resource');
}

module.exports = {
  unpublishCourseResource,
  upsertCourseResource,
};
