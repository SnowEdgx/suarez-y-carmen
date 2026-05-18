import type { CheckoutMessage } from "@/lib/checkout-status";

export type CourseDetailCourse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  cover_image_url: string | null;
  price_cents: number | null;
  is_published: boolean;
};

export type CourseDetailLesson = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_free_preview: boolean;
};

export type CourseDetailViewProps = {
  course: CourseDetailCourse;
  lessons: CourseDetailLesson[];
  previewLessons: CourseDetailLesson[];
  accessibleLessonIds: Set<string>;
  completedLessonSet: Set<string>;
  completedAccessibleLessons: number;
  progressPercent: number;
  hasPurchased: boolean;
  hasValidPrice: boolean;
  purchaseCheckUnavailable: boolean;
  isAuthenticated: boolean;
  featuredLesson: CourseDetailLesson | null;
  featuredLessonVideoUrl: string | null;
  featuredLessonVideoMessage: string | null;
  featuredLessonVideoErrorCode: string | null;
  statusMessages: CheckoutMessage[];
  checkoutReturnPath: string;
};

export function getCoursePath(slug: string) {
  return `/courses/${encodeURIComponent(slug)}`;
}

export function getLessonPath(coursePath: string, lessonId: string) {
  return `${coursePath}?lesson=${encodeURIComponent(lessonId)}`;
}
