'use strict';

const { findDocument, resolveMediaUrl, sendCmsSync } = require('../../../../utils/sync-to-backend');

function buildCourseEntry(course) {
  return {
    cmsDocumentId: course.documentId,
    cmsEntryId: String(course.id),
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

async function syncCourse(action, result) {
  const documentId = result?.documentId;
  const course = action === 'delete'
    ? result
    : await findDocument('api::course.course', documentId, { cover: true });

  if (!course) return;

  await sendCmsSync('course', action, buildCourseEntry(course));
}

module.exports = {
  async afterCreate(event) {
    await syncCourse('upsert', event.result);
  },
  async afterUpdate(event) {
    await syncCourse('upsert', event.result);
  },
  async afterDelete(event) {
    await syncCourse('delete', event.result);
  },
};
