const path = require('path');
const {
  MAX_STORAGE_OBJECT_PATH_LENGTH,
  hasUnsafePathSegments,
  isExternalHlsUri,
  isSafeStorageObjectPath,
} = require('./path-validation');

const configuredVideoBucket = (process.env.SUPABASE_VIDEO_BUCKET || '').trim();
const DEFAULT_VIDEO_BUCKET = configuredVideoBucket || 'course-videos';

function isAllowedStorageBucket(bucket) {
  return bucket === DEFAULT_VIDEO_BUCKET;
}

function parseStorageReferenceFromPath(rawValue) {
  if (typeof rawValue !== 'string') return null;

  const value = rawValue.trim().replace(/^\/+/, '');
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;

  const separatorIndex = value.indexOf(':');
  if (separatorIndex > 0) {
    const bucket = value.slice(0, separatorIndex).trim();
    const objectPath = value.slice(separatorIndex + 1).trim().replace(/^\/+/, '');
    if (!bucket || !objectPath) return null;
    if (!isAllowedStorageBucket(bucket)) return null;
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return { bucket, path: objectPath };
  }

  if (value.startsWith(`${DEFAULT_VIDEO_BUCKET}/`)) {
    const objectPath = value.slice(DEFAULT_VIDEO_BUCKET.length + 1);
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return {
      bucket: DEFAULT_VIDEO_BUCKET,
      path: objectPath,
    };
  }

  if (!isSafeStorageObjectPath(value)) return null;
  return { bucket: DEFAULT_VIDEO_BUCKET, path: value };
}

function parseStorageReferenceFromUrl(rawValue) {
  if (typeof rawValue !== 'string') return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    return null;
  }

  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  const objectSegmentIndex = segments.findIndex((segment, index) => {
    if (segment !== 'object') return false;
    const variant = segments[index + 1];
    return variant === 'public' || variant === 'authenticated' || variant === 'sign';
  });

  if (objectSegmentIndex === -1) return null;

  const bucket = segments[objectSegmentIndex + 2];
  const objectPath = segments.slice(objectSegmentIndex + 3).join('/');

  if (!bucket || !objectPath) return null;
  if (!isAllowedStorageBucket(bucket)) return null;
  if (!isSafeStorageObjectPath(objectPath)) return null;
  return { bucket, path: objectPath };
}

function resolveStorageReference(videoStoragePath, videoUrl) {
  const fromPath = parseStorageReferenceFromPath(videoStoragePath);
  if (fromPath) return fromPath;

  const fromUrl = parseStorageReferenceFromUrl(videoUrl);
  if (fromUrl) return fromUrl;

  return null;
}

function isHlsManifestPath(objectPath) {
  return typeof objectPath === 'string' && objectPath.toLowerCase().endsWith('.m3u8');
}

function getHlsRootDirectory(rootManifestPath) {
  const directory = path.posix.dirname(rootManifestPath);
  return directory === '.' ? '' : directory;
}

function assertHlsRootDirectory(rootReference) {
  if (!getHlsRootDirectory(rootReference.path)) {
    const error = new Error('HLS root manifest must be stored inside a dedicated directory.');
    error.status = 500;
    error.code = 'hls_root_directory_required';
    throw error;
  }
}

function normalizeHlsResourcePath(value) {
  if (typeof value !== 'string') return null;

  const resourcePath = value.trim();
  if (!resourcePath || resourcePath.length > MAX_STORAGE_OBJECT_PATH_LENGTH) return null;
  if (resourcePath.includes('\0') || isExternalHlsUri(resourcePath)) return null;
  if (resourcePath.startsWith('/') || hasUnsafePathSegments(resourcePath)) return null;

  const normalized = path.posix.normalize(resourcePath);
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
    return null;
  }

  return normalized;
}

function resolveHlsStorageReference(rootReference, resourcePath) {
  const normalizedResourcePath = normalizeHlsResourcePath(resourcePath);
  if (!normalizedResourcePath) return null;

  const rootDirectory = getHlsRootDirectory(rootReference.path);
  const objectPath = rootDirectory
    ? path.posix.join(rootDirectory, normalizedResourcePath)
    : normalizedResourcePath;

  if (rootDirectory && objectPath !== rootDirectory && !objectPath.startsWith(`${rootDirectory}/`)) {
    return null;
  }

  return {
    bucket: rootReference.bucket,
    path: objectPath,
  };
}

function getRelativeHlsPath(rootReference, objectPath) {
  const rootDirectory = getHlsRootDirectory(rootReference.path);
  if (!rootDirectory) return objectPath;
  if (objectPath === rootDirectory) return '';
  if (!objectPath.startsWith(`${rootDirectory}/`)) return null;
  return objectPath.slice(rootDirectory.length + 1);
}

function getHlsContentType(objectPath) {
  const extension = path.posix.extname(objectPath).toLowerCase();
  if (extension === '.m3u8') return 'application/vnd.apple.mpegurl';
  if (extension === '.ts') return 'video/mp2t';
  if (extension === '.m4s') return 'video/iso.segment';
  if (extension === '.mp4' || extension === '.m4v') return 'video/mp4';
  if (extension === '.mov' || extension === '.qt') return 'video/quicktime';
  if (extension === '.webm') return 'video/webm';
  if (extension === '.vtt') return 'text/vtt; charset=utf-8';
  if (extension === '.key') return 'application/octet-stream';
  return 'application/octet-stream';
}

module.exports = {
  assertHlsRootDirectory,
  getHlsContentType,
  getHlsRootDirectory,
  getRelativeHlsPath,
  isAllowedStorageBucket,
  isHlsManifestPath,
  normalizeHlsResourcePath,
  parseStorageReferenceFromPath,
  parseStorageReferenceFromUrl,
  resolveHlsStorageReference,
  resolveStorageReference,
};
