import { getPublicImageUrl, shouldBypassImageOptimization } from "./public-images";
import { STORAGE_ASSETS } from "./constants";

export const COURSE_IMAGE_FALLBACK = STORAGE_ASSETS.IMG_4784;

export function getCourseImageUrl(value: string | null | undefined) {
  return getPublicImageUrl(value, COURSE_IMAGE_FALLBACK) ?? COURSE_IMAGE_FALLBACK;
}

export { shouldBypassImageOptimization };
