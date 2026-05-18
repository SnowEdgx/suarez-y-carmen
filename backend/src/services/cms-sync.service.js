const {
  VALID_ACTIONS,
  VALID_MODELS,
  createHttpError,
} = require('./cms-sync/validation');
const {
  unpublishCourse,
  unpublishCourseResource,
  unpublishEvent,
  unpublishFaq,
  unpublishHomeContent,
  unpublishInPersonClass,
  unpublishLesson,
  upsertCourse,
  upsertCourseResource,
  upsertEvent,
  upsertFaq,
  upsertHomeContent,
  upsertInPersonClass,
  upsertLesson,
} = require('./cms-sync/handlers');

const CMS_SYNC_HANDLERS = {
  course: {
    upsert: upsertCourse,
    delete: unpublishCourse,
  },
  lesson: {
    upsert: upsertLesson,
    delete: unpublishLesson,
  },
  course_resource: {
    upsert: upsertCourseResource,
    delete: unpublishCourseResource,
  },
  event: {
    upsert: upsertEvent,
    delete: unpublishEvent,
  },
  home_content: {
    upsert: upsertHomeContent,
    delete: unpublishHomeContent,
  },
  faq: {
    upsert: upsertFaq,
    delete: unpublishFaq,
  },
  in_person_class: {
    upsert: upsertInPersonClass,
    delete: unpublishInPersonClass,
  },
};

async function dispatchCmsSync({ model, action, entry }) {
  const handler = CMS_SYNC_HANDLERS[model]?.[action];
  if (!handler) {
    throw createHttpError(422, 'Unsupported CMS sync operation.');
  }

  return handler(entry);
}

module.exports = {
  VALID_ACTIONS,
  VALID_MODELS,
  createHttpError,
  dispatchCmsSync,
};
