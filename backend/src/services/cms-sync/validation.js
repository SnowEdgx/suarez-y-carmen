const VALID_MODELS = new Set([
  'course',
  'lesson',
  'course_resource',
  'event',
  'home_content',
  'faq',
  'in_person_class',
]);
const VALID_ACTIONS = new Set(['upsert', 'delete']);
const VALID_LEVELS = new Set(['B\u00e1sico', 'Intermedio', 'Avanzado', 'Masterclass']);
const VALID_EVENT_TYPES = new Set(['Clase', 'Taller', 'Social', 'Congreso']);
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function optionalString(value, maxLength = 5000) {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw createHttpError(422, `String value exceeds ${maxLength} characters.`);
  }

  return normalized;
}

function requiredString(value, fieldName, maxLength = 500) {
  const normalized = optionalString(value, maxLength);
  if (!normalized) {
    throw createHttpError(422, `${fieldName} is required.`);
  }
  return normalized;
}

function optionalInteger(value, fieldName, options = {}) {
  if (value === null || typeof value === 'undefined' || value === '') return null;

  const number = Number(value);
  const min = Number.isInteger(options.min) ? options.min : Number.MIN_SAFE_INTEGER;
  const max = Number.isInteger(options.max) ? options.max : Number.MAX_SAFE_INTEGER;

  if (!Number.isInteger(number) || number < min || number > max) {
    throw createHttpError(422, `${fieldName} must be an integer between ${min} and ${max}.`);
  }

  return number;
}

function requiredInteger(value, fieldName, options = {}) {
  const number = optionalInteger(value, fieldName, options);
  if (number === null) {
    throw createHttpError(422, `${fieldName} is required.`);
  }
  return number;
}

function optionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function resolvePublishedState(entry, defaultValue = false) {
  const explicit = optionalBoolean(entry.isPublished);
  if (explicit !== null) return explicit;

  if (typeof entry.publishedAt === 'string') return true;
  if (entry.publishedAt === null) return false;

  return defaultValue;
}

function normalizeSlug(value) {
  const slug = requiredString(value, 'slug', 160).toLowerCase();
  if (!SLUG_REGEX.test(slug)) {
    throw createHttpError(422, 'slug has an invalid format.');
  }
  return slug;
}

function normalizeLevel(value) {
  const rawLevel = optionalString(value, 80) || 'B\u00e1sico';
  const repairedLevel = rawLevel
    .replace(/B\u00c3\u00a1sico/g, 'B\u00e1sico')
    .replace(/B\u00c3\u0192\u00c2\u00a1sico/g, 'B\u00e1sico');
  const asciiLevel = repairedLevel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (asciiLevel === 'basico') return 'B\u00e1sico';
  if (asciiLevel === 'intermedio') return 'Intermedio';
  if (asciiLevel === 'avanzado') return 'Avanzado';
  if (asciiLevel === 'masterclass') return 'Masterclass';
  if (VALID_LEVELS.has(repairedLevel)) return repairedLevel;

  throw createHttpError(422, 'level is not supported.');
}

function normalizeUrl(value, fieldName) {
  const url = optionalString(value, 2000);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
    if (parsed.username || parsed.password) {
      throw new Error('url credentials are not allowed');
    }
  } catch {
    throw createHttpError(422, `${fieldName} must be a valid HTTP URL.`);
  }

  return url;
}

function hasUnsafeInternalPathSegments(href) {
  const pathname = href.split(/[?#]/, 1)[0] || '';
  if (/%2f|%5c/i.test(pathname)) return true;

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return true;
  }

  if (/[\r\n\t\\]/.test(decodedPathname)) return true;
  return decodedPathname.split('/').some((segment) => segment === '.' || segment === '..');
}

function normalizeHref(value, fieldName) {
  const href = optionalString(value, 2000);
  if (!href) return null;

  if (/^#[A-Za-z0-9_-]+$/.test(href)) {
    return href;
  }

  if (
    href.startsWith('/') &&
    !href.startsWith('//') &&
    !/[\r\n\t\\]/.test(href) &&
    !hasUnsafeInternalPathSegments(href)
  ) {
    return href;
  }

  return normalizeUrl(href, fieldName);
}

function normalizePrivateStoragePath(value, fieldName) {
  const rawPath = optionalString(value, 1000);
  if (!rawPath) return null;

  const normalized = rawPath.replace(/^\/+/, '');
  const segments = normalized.split('/');
  const hasUnsafeSegment = segments.some((segment) => {
    if (!segment || segment === '.' || segment === '..') return true;

    try {
      const decodedSegment = decodeURIComponent(segment);
      return decodedSegment === '.' || decodedSegment === '..' || decodedSegment.includes('/') || decodedSegment.includes('\\');
    } catch {
      return true;
    }
  });

  if (
    hasUnsafeSegment ||
    normalized.includes('\0') ||
    normalized.includes('\\') ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)
  ) {
    throw createHttpError(422, `${fieldName} must be a private storage object path.`);
  }

  return normalized;
}

function normalizeVideoStoragePath(value) {
  return normalizePrivateStoragePath(value, 'videoStoragePath');
}

function normalizeResourceStoragePath(value) {
  return normalizePrivateStoragePath(value, 'resourceStoragePath');
}

function assertSupabase(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

module.exports = {
  VALID_ACTIONS,
  VALID_EVENT_TYPES,
  VALID_MODELS,
  assertSupabase,
  createHttpError,
  normalizeHref,
  normalizeLevel,
  normalizeSlug,
  normalizeUrl,
  normalizeResourceStoragePath,
  normalizeVideoStoragePath,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredInteger,
  requiredString,
  resolvePublishedState,
};
