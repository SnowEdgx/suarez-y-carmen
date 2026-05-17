const MAX_REDIRECT_PATH_LENGTH = 500;

export function getSafeInternalPath(rawValue: unknown, fallback = "/courses") {
  if (typeof rawValue !== "string") return fallback;

  const path = rawValue.trim();
  if (!path || path.length > MAX_REDIRECT_PATH_LENGTH) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (/[\r\n\t]/.test(path)) return fallback;

  return path;
}

export function getSafeCoursePath(rawValue: unknown, fallback = "/courses") {
  const path = getSafeInternalPath(rawValue, fallback);
  if (path === "/courses" || path.startsWith("/courses/")) return path;
  return fallback;
}
