const { supabase } = require('../../config/supabase');
const { storagePathToVideoUrl } = require('./common');
const {
  assertSupabase,
  createHttpError,
  normalizeVideoStoragePath,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredInteger,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findCourseByReference, findLesson } = require('./finders');

async function upsertLesson(entry) {
  const course = await findCourseByReference(entry);
  if (!course?.id) {
    throw createHttpError(422, 'Linked course could not be found in Supabase.');
  }

  const title = requiredString(entry.title, 'title', 255);
  const position = requiredInteger(entry.position, 'position', { min: 1, max: 1000 });
  const durationSeconds = optionalInteger(entry.durationSeconds, 'durationSeconds', { min: 0, max: 86400 });
  const videoStoragePath = normalizeVideoStoragePath(entry.videoStoragePath);
  const existing = await findLesson(entry, course.id, position);

  if (!existing?.id && !videoStoragePath) {
    throw createHttpError(422, 'videoStoragePath is required for new lessons.');
  }

  const finalVideoStoragePath = videoStoragePath || existing.video_storage_path;
  const finalVideoUrl = videoStoragePath ? storagePathToVideoUrl(videoStoragePath) : existing.video_url;
  const payload = {
    course_id: course.id,
    title,
    description: optionalString(entry.description, 10000),
    video_url: finalVideoUrl,
    video_storage_path: finalVideoStoragePath,
    duration_seconds: durationSeconds,
    position,
    is_free_preview: optionalBoolean(entry.isFreePreview) ?? false,
    is_published: resolvePublishedState(entry),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('lessons').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('lessons').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync lesson');
}

async function unpublishLesson(entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (cmsDocumentId) {
    const existingByDocumentId = await findLesson(entry, null, null, { allowFallback: false });
    if (!existingByDocumentId?.id) return { id: null, skipped: true };

    const result = await supabase
      .from('lessons')
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq('id', existingByDocumentId.id)
      .select('id')
      .single();

    return assertSupabase(result, 'Could not unpublish lesson');
  }

  const course = await findCourseByReference(entry);
  if (!course?.id) return { id: null, skipped: true };

  const position = optionalInteger(entry.position, 'position', { min: 1, max: 1000 });
  if (!position) return { id: null, skipped: true };

  const existing = await findLesson(entry, course.id, position);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('lessons')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish lesson');
}

module.exports = {
  unpublishLesson,
  upsertLesson,
};
