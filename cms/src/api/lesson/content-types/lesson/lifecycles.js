'use strict';

const { findDocument, sendCmsSync } = require('../../../../utils/sync-to-backend');

function buildLessonEntry(lesson) {
  return {
    cmsDocumentId: lesson.documentId,
    cmsEntryId: String(lesson.id),
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

async function syncLesson(action, result) {
  const documentId = result?.documentId;
  const lesson = action === 'delete'
    ? result
    : await findDocument('api::lesson.lesson', documentId, { course: true });

  if (!lesson) return;

  await sendCmsSync('lesson', action, buildLessonEntry(lesson));
}

module.exports = {
  async afterCreate(event) {
    await syncLesson('upsert', event.result);
  },
  async afterUpdate(event) {
    await syncLesson('upsert', event.result);
  },
  async afterDelete(event) {
    await syncLesson('delete', event.result);
  },
};
