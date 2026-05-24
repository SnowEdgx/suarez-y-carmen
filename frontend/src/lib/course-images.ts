import { getPublicImageUrl, shouldBypassImageOptimization } from "./public-images";

export const COURSE_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=1200&auto=format&fit=crop";

export function getCourseImageUrl(value: string | null | undefined) {
  return getPublicImageUrl(value, COURSE_IMAGE_FALLBACK) ?? COURSE_IMAGE_FALLBACK;
}

export { shouldBypassImageOptimization };
