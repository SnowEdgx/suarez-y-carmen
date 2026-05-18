const { supabase } = require('../../config/supabase');
const {
  assertSupabase,
  normalizeHref,
  normalizeUrl,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findInPersonClass } = require('./finders');

async function upsertInPersonClass(entry) {
  const title = requiredString(entry.title, 'title', 255);
  const existing = await findInPersonClass({ ...entry, title });
  const isPublished = resolvePublishedState(entry, true);
  const explicitActive = optionalBoolean(entry.isActive);
  const payload = {
    title,
    city: optionalString(entry.city, 255),
    venue: optionalString(entry.venue, 255),
    schedule: optionalString(entry.schedule, 255),
    description: optionalString(entry.description, 5000),
    image_url: normalizeUrl(entry.imageUrl, 'imageUrl'),
    map_url: normalizeHref(entry.mapUrl, 'mapUrl'),
    contact_url: normalizeHref(entry.contactUrl, 'contactUrl'),
    position: optionalInteger(entry.position, 'position', { min: 0, max: 1000 }) ?? 0,
    is_active: isPublished && (explicitActive ?? true),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('in_person_classes').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('in_person_classes').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync in-person class');
}

async function unpublishInPersonClass(entry) {
  const existing = await findInPersonClass(entry);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('in_person_classes')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish in-person class');
}

module.exports = {
  unpublishInPersonClass,
  upsertInPersonClass,
};
