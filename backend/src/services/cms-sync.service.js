const { supabase } = require('../config/supabase');

const DEFAULT_VIDEO_BUCKET = (process.env.SUPABASE_VIDEO_BUCKET || 'course-videos').trim();
const VALID_MODELS = new Set(['course', 'lesson', 'event', 'home_content', 'faq', 'in_person_class']);
const VALID_ACTIONS = new Set(['upsert', 'delete']);
const VALID_LEVELS = new Set(['B\u00e1sico', 'Intermedio', 'Avanzado', 'Masterclass']);
const VALID_EVENT_TYPES = new Set(['Clase', 'Taller', 'Social', 'Congreso']);
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function optionalString(value, maxLength = 5000) {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw createHttpError(422, `String value exceeds ${maxLength} characters.`);
  }

  return normalized;
}

function requiredString(value, fieldName, maxLength = 500) {
  const normalized = optionalString(value, maxLength);
  if (!normalized) {
    throw createHttpError(422, `${fieldName} is required.`);
  }
  return normalized;
}

function optionalInteger(value, fieldName, options = {}) {
  if (value === null || typeof value === 'undefined' || value === '') return null;

  const number = Number(value);
  const min = Number.isInteger(options.min) ? options.min : Number.MIN_SAFE_INTEGER;
  const max = Number.isInteger(options.max) ? options.max : Number.MAX_SAFE_INTEGER;

  if (!Number.isInteger(number) || number < min || number > max) {
    throw createHttpError(422, `${fieldName} must be an integer between ${min} and ${max}.`);
  }

  return number;
}

function requiredInteger(value, fieldName, options = {}) {
  const number = optionalInteger(value, fieldName, options);
  if (number === null) {
    throw createHttpError(422, `${fieldName} is required.`);
  }
  return number;
}

function optionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function resolvePublishedState(entry, defaultValue = false) {
  const explicit = optionalBoolean(entry.isPublished);
  if (explicit !== null) return explicit;

  if (typeof entry.publishedAt === 'string') return true;
  if (entry.publishedAt === null) return false;

  return defaultValue;
}

function normalizeSlug(value) {
  const slug = requiredString(value, 'slug', 160).toLowerCase();
  if (!SLUG_REGEX.test(slug)) {
    throw createHttpError(422, 'slug has an invalid format.');
  }
  return slug;
}

function normalizeLevel(value) {
  const rawLevel = optionalString(value, 80) || 'B\u00e1sico';
  const repairedLevel = rawLevel
    .replace(/B\u00c3\u00a1sico/g, 'B\u00e1sico')
    .replace(/B\u00c3\u0192\u00c2\u00a1sico/g, 'B\u00e1sico');
  const asciiLevel = repairedLevel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (asciiLevel === 'basico') return 'B\u00e1sico';
  if (asciiLevel === 'intermedio') return 'Intermedio';
  if (asciiLevel === 'avanzado') return 'Avanzado';
  if (asciiLevel === 'masterclass') return 'Masterclass';
  if (VALID_LEVELS.has(repairedLevel)) return repairedLevel;

  throw createHttpError(422, 'level is not supported.');
}

function normalizeUrl(value, fieldName) {
  const url = optionalString(value, 2000);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
  } catch {
    throw createHttpError(422, `${fieldName} must be a valid HTTP URL.`);
  }

  return url;
}

function normalizeHref(value, fieldName) {
  const href = optionalString(value, 2000);
  if (!href) return null;

  if (/^#[A-Za-z0-9_-]+$/.test(href)) {
    return href;
  }

  if (href.startsWith('/') && !href.startsWith('//') && !/[\r\n\t]/.test(href)) {
    return href;
  }

  return normalizeUrl(href, fieldName);
}

function normalizeVideoStoragePath(value) {
  const rawPath = optionalString(value, 1000);
  if (!rawPath) return null;

  const normalized = rawPath.replace(/^\/+/, '');
  if (normalized.includes('..') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    throw createHttpError(422, 'videoStoragePath must be a private storage object path.');
  }

  return normalized;
}

function storagePathToVideoUrl(storagePath) {
  return `${DEFAULT_VIDEO_BUCKET}/${storagePath}`;
}

function assertSupabase(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

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

async function dispatchCmsSync({ model, action, entry }) {
  if (model === 'course' && action === 'upsert') return upsertCourse(entry);
  if (model === 'course' && action === 'delete') return unpublishCourse(entry);
  if (model === 'lesson' && action === 'upsert') return upsertLesson(entry);
  if (model === 'lesson' && action === 'delete') return unpublishLesson(entry);
  if (model === 'event' && action === 'upsert') return upsertEvent(entry);
  if (model === 'event' && action === 'delete') return unpublishEvent(entry);
  if (model === 'home_content' && action === 'upsert') return upsertHomeContent(entry);
  if (model === 'home_content' && action === 'delete') return unpublishHomeContent(entry);
  if (model === 'faq' && action === 'upsert') return upsertFaq(entry);
  if (model === 'faq' && action === 'delete') return unpublishFaq(entry);
  if (model === 'in_person_class' && action === 'upsert') return upsertInPersonClass(entry);
  if (model === 'in_person_class' && action === 'delete') return unpublishInPersonClass(entry);

  throw createHttpError(422, 'Unsupported CMS sync operation.');
}

module.exports = {
  VALID_ACTIONS,
  VALID_MODELS,
  createHttpError,
  dispatchCmsSync,
};
