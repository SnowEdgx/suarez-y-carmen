const path = require('path');
const { supabase } = require('../config/supabase');

const DEFAULT_VIDEO_BUCKET = (process.env.SUPABASE_VIDEO_BUCKET || 'course-videos').trim();
const RAW_SIGNED_URL_TTL_SECONDS = Number.parseInt(
  process.env.VIDEO_SIGNED_URL_TTL_SECONDS || '900',
  10
);
const SIGNED_URL_TTL_SECONDS =
  Number.isInteger(RAW_SIGNED_URL_TTL_SECONDS) && RAW_SIGNED_URL_TTL_SECONDS >= 60
    ? Math.min(RAW_SIGNED_URL_TTL_SECONDS, 3600)
    : 900;
const MAX_STORAGE_OBJECT_PATH_LENGTH = 1024;

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

  const normalized = path.posix.normalize(objectPath);
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return false;
  return !path.posix.isAbsolute(normalized);
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

function isExternalHlsUri(uri) {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith('//');
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

  const resourcePath = value.trim().replace(/^\/+/, '');
  if (!resourcePath || resourcePath.length > MAX_STORAGE_OBJECT_PATH_LENGTH) return null;
  if (resourcePath.includes('\0') || isExternalHlsUri(resourcePath)) return null;

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
  if (extension === '.vtt') return 'text/vtt; charset=utf-8';
  if (extension === '.key') return 'application/octet-stream';
  return 'application/octet-stream';
}

async function createStorageSignedUrl(storageReference) {
  const { data, error } = await supabase.storage
    .from(storageReference.bucket)
    .createSignedUrl(storageReference.path, Math.min(SIGNED_URL_TTL_SECONDS, 300));

  if (error || !data?.signedUrl) {
    console.error(
      '[Video Storage Service] Error creating signed URL:',
      error?.message || 'unknown storage error'
    );
    const signingError = new Error('Could not create signed storage URL.');
    signingError.status = 500;
    throw signingError;
  }

  return data.signedUrl;
}

async function fetchStorageObject(storageReference, options = {}) {
  const signedUrl = await createStorageSignedUrl(storageReference);
  return fetch(signedUrl, {
    headers: options.rangeHeader ? { Range: options.rangeHeader } : {},
  });
}

function buildHlsResourceUrl(rawToken, resourcePath) {
  return `/api/lessons/hls/${encodeURIComponent(rawToken)}/resource?path=${encodeURIComponent(resourcePath)}`;
}

function resolveManifestUri({ rootReference, currentReference, uri }) {
  const trimmedUri = typeof uri === 'string' ? uri.trim() : '';
  if (!trimmedUri || isExternalHlsUri(trimmedUri)) return null;
  if (trimmedUri.length > MAX_STORAGE_OBJECT_PATH_LENGTH || trimmedUri.includes('\0')) return null;

  const rootDirectory = getHlsRootDirectory(rootReference.path);
  const currentDirectory = path.posix.dirname(currentReference.path);
  const safeCurrentDirectory = currentDirectory === '.' ? '' : currentDirectory;
  const objectPath = path.posix.normalize(
    safeCurrentDirectory ? path.posix.join(safeCurrentDirectory, trimmedUri) : trimmedUri
  );

  if (rootDirectory && objectPath !== rootDirectory && !objectPath.startsWith(`${rootDirectory}/`)) {
    return null;
  }

  if (objectPath.startsWith('../') || objectPath.includes('/../')) return null;

  return getRelativeHlsPath(rootReference, objectPath);
}

function rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken }) {
  return line.replace(/URI="([^"]+)"/g, (match, uri) => {
    const relativePath = resolveManifestUri({ rootReference, currentReference, uri });
    if (!relativePath) return match;

    return `URI="${buildHlsResourceUrl(rawToken, relativePath)}"`;
  });
}

function rewriteHlsManifest({ manifestText, rootReference, currentReference, rawToken }) {
  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      if (trimmedLine.startsWith('#')) {
        return rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken });
      }

      const relativePath = resolveManifestUri({
        rootReference,
        currentReference,
        uri: trimmedLine,
      });

      return relativePath ? buildHlsResourceUrl(rawToken, relativePath) : '# blocked external HLS URI';
    })
    .join('\n');
}

module.exports = {
  assertHlsRootDirectory,
  fetchStorageObject,
  getHlsContentType,
  isHlsManifestPath,
  isHttpUrl,
  resolveHlsStorageReference,
  resolveStorageReference,
  rewriteHlsManifest,
};
