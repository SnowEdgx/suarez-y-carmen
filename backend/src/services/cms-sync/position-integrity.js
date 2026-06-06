const { supabase } = require('../../config/supabase');
const { createHttpError } = require('./validation');

async function assertNoPublishedPositionConflict({
  table,
  entityName,
  courseId,
  position,
  currentId,
}) {
  if (!courseId || !Number.isInteger(position)) return;

  let query = supabase
    .from(table)
    .select('id, cms_document_id')
    .eq('course_id', courseId)
    .eq('position', position)
    .eq('is_published', true)
    .limit(1);

  if (currentId) {
    query = query.neq('id', currentId);
  }

  const result = await query.maybeSingle();
  if (result.error) throw result.error;

  if (result.data) {
    throw createHttpError(
      409,
      `${entityName} position ${position} is already used by another published item in this course.`
    );
  }
}

module.exports = {
  assertNoPublishedPositionConflict,
};
