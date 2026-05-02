'use strict';

const { findDocument, resolveMediaUrl, sendCmsSync } = require('../../../../utils/sync-to-backend');

function buildEventEntry(event) {
  return {
    cmsDocumentId: event.documentId,
    cmsEntryId: String(event.id),
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

async function syncEvent(action, result) {
  const documentId = result?.documentId;
  const event = action === 'delete'
    ? result
    : await findDocument('api::event.event', documentId, { image: true });

  if (!event) return;

  await sendCmsSync('event', action, buildEventEntry(event));
}

module.exports = {
  async afterCreate(event) {
    await syncEvent('upsert', event.result);
  },
  async afterUpdate(event) {
    await syncEvent('upsert', event.result);
  },
  async afterDelete(event) {
    await syncEvent('delete', event.result);
  },
};
