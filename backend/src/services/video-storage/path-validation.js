const path = require('path');

const MAX_STORAGE_OBJECT_PATH_LENGTH = 1024;

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function hasUnsafePathSegments(value, options = {}) {
  if (value.includes('\\')) return true;

  return value.split('/').some((segment) => {
    if (!segment || segment === '.') return true;

    const decodedSegment = decodePathSegment(segment);
    if (!decodedSegment || decodedSegment.includes('\0')) return true;
    if (decodedSegment.includes('/') || decodedSegment.includes('\\')) return true;
    if (decodedSegment === '.') return true;
    if (decodedSegment === '..' && !options.allowParentSegments) return true;

    return false;
  });
}

function isExternalHlsUri(uri) {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith('//');
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeStorageObjectPath(objectPath) {
  if (typeof objectPath !== 'string') return false;
  if (!objectPath || objectPath.length > MAX_STORAGE_OBJECT_PATH_LENGTH) return false;
  if (objectPath.includes('\0') || /^[a-z][a-z0-9+.-]*:\/\//i.test(objectPath)) return false;
  if (hasUnsafePathSegments(objectPath)) return false;

  const normalized = path.posix.normalize(objectPath);
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return false;
  return normalized === objectPath && !path.posix.isAbsolute(normalized);
}

module.exports = {
  MAX_STORAGE_OBJECT_PATH_LENGTH,
  hasUnsafePathSegments,
  isExternalHlsUri,
  isHttpUrl,
  isSafeStorageObjectPath,
};
