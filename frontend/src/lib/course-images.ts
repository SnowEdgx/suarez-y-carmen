export const COURSE_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=1200&auto=format&fit=crop";

export function getCourseImageUrl(value: string | null | undefined) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return COURSE_IMAGE_FALLBACK;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? candidate : COURSE_IMAGE_FALLBACK;
  } catch {
    return COURSE_IMAGE_FALLBACK;
  }
}

export function shouldBypassImageOptimization(src: string) {
  try {
    const url = new URL(src);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.port === "1337"
    );
  } catch {
    return false;
  }
}
