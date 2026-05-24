export function hasUnsafeInternalPathSegments(path: string) {
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  if (/%2f|%5c/i.test(pathname)) return true;

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return true;
  }

  if (/[\r\n\t\\]/.test(decodedPathname)) return true;
  return decodedPathname.split("/").some((segment) => segment === "." || segment === "..");
}
