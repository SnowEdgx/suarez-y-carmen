const { supabase } = require('../../config/supabase');
const {
  VALID_EVENT_TYPES,
  assertSupabase,
  createHttpError,
  normalizeHref,
  normalizeLevel,
  normalizeSlug,
  normalizeUrl,
  normalizeVideoStoragePath,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredInteger,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const {
  findCourse,
  findCourseByReference,
  findEvent,
  findFaq,
  findInPersonClass,
  findLesson,
} = require('./finders');

const DEFAULT_VIDEO_BUCKET = (process.env.SUPABASE_VIDEO_BUCKET || 'course-videos').trim();

function storagePathToVideoUrl(storagePath) {
  return `${DEFAULT_VIDEO_BUCKET}/${storagePath}`;
}

async function upsertCourse(entry) {
  const title = requiredString(entry.title, 'title', 255);
  const slug = normalizeSlug(entry.slug);
  const level = normalizeLevel(entry.level);
  const priceCents = requiredInteger(entry.priceCents, 'priceCents', { min: 1, max: 500000 });
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
  const course = await findCourseByReference(entry);
  if (!course?.id && !entry.cmsDocumentId) return { id: null, skipped: true };

  const position = optionalInteger(entry.position, 'position', { min: 1, max: 1000 });
  const existing = course?.id && position ? await findLesson(entry, course.id, position) : await findLesson(entry, '', 0);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('lessons')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish lesson');
}

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

  const existing = await findEvent({ ...entry, title, eventDate: parsedEventDate.toISOString() });
  const isActive = optionalBoolean(entry.isActive) ?? resolvePublishedState(entry, true);
  const payload = {
    title,
    city,
    event_date: parsedEventDate.toISOString(),
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
  const existing = await findEvent(entry);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('events')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish event');
}

async function upsertHomeContent(entry) {
  const payload = {
    id: 'home',
    hero_eyebrow: optionalString(entry.heroEyebrow, 160),
    hero_title: optionalString(entry.heroTitle, 255),
    hero_subtitle: optionalString(entry.heroSubtitle, 2000),
    hero_video_url: normalizeUrl(entry.heroVideoUrl, 'heroVideoUrl'),
    primary_cta_label: optionalString(entry.primaryCtaLabel, 120),
    primary_cta_href: normalizeHref(entry.primaryCtaHref, 'primaryCtaHref'),
    secondary_cta_label: optionalString(entry.secondaryCtaLabel, 120),
    secondary_cta_href: normalizeHref(entry.secondaryCtaHref, 'secondaryCtaHref'),
    is_published: resolvePublishedState(entry),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = await supabase
    .from('home_content')
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .single();

  return assertSupabase(result, 'Could not sync home content');
}

async function unpublishHomeContent() {
  const existing = await supabase
    .from('home_content')
    .select('id')
    .eq('id', 'home')
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (!existing.data) return { id: null, skipped: true };

  const result = await supabase
    .from('home_content')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', 'home')
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish home content');
}

async function upsertFaq(entry) {
  const question = requiredString(entry.question, 'question', 255);
  const answer = requiredString(entry.answer, 'answer', 10000);
  const existing = await findFaq({ ...entry, question });
  const payload = {
    question,
    answer,
    position: optionalInteger(entry.position, 'position', { min: 0, max: 1000 }) ?? 0,
    is_published: resolvePublishedState(entry),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('faqs').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('faqs').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync FAQ');
}

async function unpublishFaq(entry) {
  const existing = await findFaq(entry);
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('faqs')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish FAQ');
}

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
  unpublishCourse,
  unpublishEvent,
  unpublishFaq,
  unpublishHomeContent,
  unpublishInPersonClass,
  unpublishLesson,
  upsertCourse,
  upsertEvent,
  upsertFaq,
  upsertHomeContent,
  upsertInPersonClass,
  upsertLesson,
};
