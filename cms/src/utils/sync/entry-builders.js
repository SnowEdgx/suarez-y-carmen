'use strict';

const { resolveMediaUrl } = require('./media');

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

function buildHomeContentEntry(homeContent) {
  return {
    cmsDocumentId: homeContent.documentId,
    cmsEntryId: homeContent.id ? String(homeContent.id) : null,
    heroEyebrow: homeContent.heroEyebrow,
    heroTitle: homeContent.heroTitle,
    heroSubtitle: homeContent.heroSubtitle,
    heroVideoUrl: homeContent.heroVideoUrl,
    primaryCtaLabel: homeContent.primaryCtaLabel,
    primaryCtaHref: homeContent.primaryCtaHref,
    secondaryCtaLabel: homeContent.secondaryCtaLabel,
    secondaryCtaHref: homeContent.secondaryCtaHref,
    isPublished: Boolean(homeContent.publishedAt),
    publishedAt: homeContent.publishedAt,
  };
}

function buildFaqEntry(faq) {
  return {
    cmsDocumentId: faq.documentId,
    cmsEntryId: faq.id ? String(faq.id) : null,
    question: faq.question,
    answer: faq.answer,
    position: faq.position,
    isPublished: Boolean(faq.publishedAt),
    publishedAt: faq.publishedAt,
  };
}

function buildInPersonClassEntry(classItem) {
  return {
    cmsDocumentId: classItem.documentId,
    cmsEntryId: classItem.id ? String(classItem.id) : null,
    title: classItem.title,
    city: classItem.city,
    venue: classItem.venue,
    schedule: classItem.schedule,
    description: classItem.description,
    mapUrl: classItem.mapUrl,
    contactUrl: classItem.contactUrl,
    imageUrl: resolveMediaUrl(classItem.image),
    position: classItem.position,
    isActive: classItem.isActive,
    isPublished: Boolean(classItem.publishedAt),
    publishedAt: classItem.publishedAt,
  };
}

module.exports = {
  buildCourseEntry,
  buildEventEntry,
  buildFaqEntry,
  buildHomeContentEntry,
  buildInPersonClassEntry,
  buildLessonEntry,
};
