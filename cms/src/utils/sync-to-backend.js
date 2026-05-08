'use strict';

function getBackendUrl() {
  return (process.env.CMS_SYNC_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
}

function getPublicUrl() {
  return (process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || 'http://localhost:1337').replace(/\/+$/, '');
}

function resolveMediaUrl(media) {
  const item = Array.isArray(media) ? media[0] : media;
  if (!item || typeof item.url !== 'string') return null;

  if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
    return item.url;
  }

  return `${getPublicUrl()}${item.url.startsWith('/') ? '' : '/'}${item.url}`;
}

function buildCourseEntry(course) {
  return {
    cmsDocumentId: course.documentId,
    cmsEntryId: course.id ? String(course.id) : null,
    title: course.title,
    slug: course.slug,
    description: course.description,
    level: course.level,
    priceCents: course.priceCents,
    coverImageUrl: resolveMediaUrl(course.cover),
    isPublished: Boolean(course.publishedAt),
    publishedAt: course.publishedAt,
  };
}

function buildLessonEntry(lesson) {
  return {
    cmsDocumentId: lesson.documentId,
    cmsEntryId: lesson.id ? String(lesson.id) : null,
    courseDocumentId: lesson.course?.documentId,
    courseSlug: lesson.course?.slug,
    title: lesson.title,
    description: lesson.description,
    position: lesson.position,
    durationSeconds: lesson.durationSeconds,
    isFreePreview: lesson.isFreePreview,
    videoStoragePath: lesson.videoStoragePath,
    isPublished: Boolean(lesson.publishedAt),
    publishedAt: lesson.publishedAt,
  };
}

function buildEventEntry(event) {
  return {
    cmsDocumentId: event.documentId,
    cmsEntryId: event.id ? String(event.id) : null,
    title: event.title,
    city: event.city,
    eventDate: event.eventDate,
    type: event.type,
    imageUrl: resolveMediaUrl(event.image),
    locationUrl: event.locationUrl,
    ticketUrl: event.ticketUrl,
    isActive: event.isActive,
    isPublished: Boolean(event.publishedAt),
    publishedAt: event.publishedAt,
  };
}

const SYNC_MODELS = {
  'api::course.course': {
    model: 'course',
    populate: { cover: true },
    buildEntry: buildCourseEntry,
  },
  'api::lesson.lesson': {
    model: 'lesson',
    populate: { course: true },
    buildEntry: buildLessonEntry,
  },
  'api::event.event': {
    model: 'event',
    populate: { image: true },
    buildEntry: buildEventEntry,
  },
};

const SYNC_ACTIONS = {
  publish: 'upsert',
  unpublish: 'delete',
  delete: 'delete',
};

async function sendCmsSync(model, action, entry) {
  const token = process.env.CMS_SYNC_TOKEN;
  if (!token) {
    strapi.log.warn('[CMS Sync] CMS_SYNC_TOKEN is missing. Entry was not synced.');
    return;
  }

  const response = await fetch(`${getBackendUrl()}/api/cms/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, action, entry }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CMS sync failed with ${response.status}: ${body}`);
  }
}

async function findDocument(uid, documentId, populate, status) {
  if (!documentId) return null;

  const query = { documentId, populate };
  if (status) query.status = status;

  return strapi.documents(uid).findOne(query);
}

function pushDocumentId(target, value) {
  if (typeof value === 'string' && value) {
    target.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => pushDocumentId(target, item));
  }
}

function getResultDocuments(result) {
  if (Array.isArray(result)) return result.filter((item) => item?.documentId);
  if (Array.isArray(result?.entries)) return result.entries.filter((item) => item?.documentId);
  if (result?.documentId) return [result];
  return [];
}

function getDocumentIds(context, result) {
  const documentIds = [];

  getResultDocuments(result).forEach((document) => pushDocumentId(documentIds, document.documentId));
  pushDocumentId(documentIds, context?.params?.documentId);
  pushDocumentId(documentIds, context?.params?.documentIds);
  pushDocumentId(documentIds, context?.params?.where?.documentId);

  return [...new Set(documentIds)];
}

async function syncDocumentAction(context, result) {
  const config = SYNC_MODELS[context?.uid];
  const backendAction = SYNC_ACTIONS[context?.action];
  if (!config || !backendAction) return;

  const documentIds = getDocumentIds(context, result);
  if (documentIds.length === 0) {
    strapi.log.warn(`[CMS Sync] Could not resolve documentId for ${context.uid}.${context.action}.`);
    return;
  }

  const resultDocuments = getResultDocuments(result);

  for (const documentId of documentIds) {
    const document = backendAction === 'upsert'
      ? await findDocument(context.uid, documentId, config.populate, 'published')
      : resultDocuments.find((item) => item.documentId === documentId) || { documentId };

    if (backendAction === 'upsert' && !document) {
      strapi.log.warn(`[CMS Sync] Published ${context.uid} ${documentId} could not be loaded.`);
      continue;
    }

    await sendCmsSync(config.model, backendAction, config.buildEntry(document));
  }
}

module.exports = {
  buildCourseEntry,
  buildEventEntry,
  buildLessonEntry,
  findDocument,
  resolveMediaUrl,
  sendCmsSync,
  syncDocumentAction,
};
