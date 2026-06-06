const { supabase } = require('../../config/supabase');
const {
  VALID_EVENT_TYPES,
  assertSupabase,
  createHttpError,
  normalizeUrl,
  optionalBoolean,
  optionalString,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findEvent } = require('./finders');

async function upsertEvent(entry) {
  const title = requiredString(entry.title, 'title', 255);
  const city = requiredString(entry.city, 'city', 255);
  const type = optionalString(entry.type, 80) || 'Taller';
  if (!VALID_EVENT_TYPES.has(type)) {
    throw createHttpError(422, 'event type is not supported.');
  }

  const rawEventDate = requiredString(entry.eventDate, 'eventDate', 80);
  const parsedEventDate = new Date(rawEventDate);
  if (Number.isNaN(parsedEventDate.getTime())) {
    throw createHttpError(422, 'eventDate must be a valid date.');
  }

  const rawEndDate = optionalString(entry.endDate, 80);
  const parsedEndDate = rawEndDate ? new Date(rawEndDate) : null;
  if (rawEndDate && Number.isNaN(parsedEndDate.getTime())) {
    throw createHttpError(422, 'endDate must be a valid date.');
  }
  if (parsedEndDate && parsedEndDate.getTime() < parsedEventDate.getTime()) {
    throw createHttpError(422, 'endDate must be greater than or equal to eventDate.');
  }

  const existing = await findEvent({ ...entry, title, eventDate: parsedEventDate.toISOString() });
  const isActive = optionalBoolean(entry.isActive) ?? resolvePublishedState(entry, true);
  const payload = {
    title,
    city,
    event_date: parsedEventDate.toISOString(),
    end_date: parsedEndDate ? parsedEndDate.toISOString() : null,
    image_url: normalizeUrl(entry.imageUrl, 'imageUrl'),
    location_url: normalizeUrl(entry.locationUrl, 'locationUrl'),
    ticket_url: normalizeUrl(entry.ticketUrl, 'ticketUrl'),
    type,
    is_active: isActive,
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('events').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('events').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync event');
}

async function unpublishEvent(entry) {
  const existing = await findEvent(entry, { allowFallback: !entry.cmsDocumentId });
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('events')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish event');
}

module.exports = {
  unpublishEvent,
  upsertEvent,
};
