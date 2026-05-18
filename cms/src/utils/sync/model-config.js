'use strict';

const {
  buildCourseEntry,
  buildEventEntry,
  buildFaqEntry,
  buildHomeContentEntry,
  buildInPersonClassEntry,
  buildLessonEntry,
} = require('./entry-builders');

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
  'api::home-content.home-content': {
    model: 'home_content',
    populate: {},
    buildEntry: buildHomeContentEntry,
  },
  'api::faq.faq': {
    model: 'faq',
    populate: {},
    buildEntry: buildFaqEntry,
  },
  'api::in-person-class.in-person-class': {
    model: 'in_person_class',
    populate: { image: true },
    buildEntry: buildInPersonClassEntry,
  },
};

const SYNC_ACTIONS = {
  create: 'upsert',
  update: 'upsert',
  publish: 'upsert',
  unpublish: 'delete',
  delete: 'delete',
};

module.exports = {
  SYNC_ACTIONS,
  SYNC_MODELS,
};
