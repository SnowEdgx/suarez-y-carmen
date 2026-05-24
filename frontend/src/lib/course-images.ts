import { getPublicImageUrl, shouldBypassImageOptimization } from "./public-images";

export function getCourseImageUrl(value: string | null | undefined) {
  return getPublicImageUrl(value);
}

export { shouldBypassImageOptimization };
