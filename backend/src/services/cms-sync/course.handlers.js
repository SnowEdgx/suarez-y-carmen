const { supabase } = require('../../config/supabase');
const {
  assertSupabase,
  normalizeLevel,
  normalizeSlug,
  normalizeUrl,
  optionalInteger,
  optionalString,
  requiredInteger,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findCourse } = require('./finders');

async function upsertCourse(entry) {
  const title = requiredString(entry.title, 'title', 255);
  const slug = normalizeSlug(entry.slug);
  const level = normalizeLevel(entry.level);
  const priceCents = requiredInteger(entry.priceCents, 'priceCents', { min: 1, max: 500000 });
  const position = optionalInteger(entry.order ?? entry.position, 'order', { min: 0, max: 100000 }) ?? 0;
  const existing = await findCourse({ ...entry, slug });
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  const cmsEntryId = optionalString(entry.cmsEntryId, 255);

  const payload = {
    title,
    slug,
    description: optionalString(entry.description, 10000),
    cover_image_url: normalizeUrl(entry.coverImageUrl, 'coverImageUrl'),
    level,
    price_cents: priceCents,
    position,
    is_published: resolvePublishedState(entry),
    cms_document_id: cmsDocumentId,
    cms_entry_id: cmsEntryId,
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('courses').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('courses').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync course');
}

async function unpublishCourse(entry) {
  const existing = await findCourse(entry);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('courses')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish course');
}

module.exports = {
  unpublishCourse,
  upsertCourse,
};
