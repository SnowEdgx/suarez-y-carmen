const { Readable } = require('stream');
const { getForwardableRangeHeader } = require('../utils/range-header');
const { isSafeStorageObjectPath } = require('./video-storage/path-validation');
const { fetchStorageObject } = require('./video-storage.service');

const configuredResourceBucket = (process.env.SUPABASE_RESOURCE_BUCKET || '').trim();
const DEFAULT_RESOURCE_BUCKET = configuredResourceBucket || 'course-resources';
const isProduction = process.env.NODE_ENV === 'production';
const CONTENT_TYPE_BY_EXTENSION = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

function isAllowedResourceBucket(bucket) {
  return bucket === DEFAULT_RESOURCE_BUCKET;
}

function resolveResourceStorageReference(rawValue) {
  if (typeof rawValue !== 'string') return null;

  const value = rawValue.trim().replace(/^\/+/, '');
  if (!value || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;

  const separatorIndex = value.indexOf(':');
  if (separatorIndex > 0) {
    const bucket = value.slice(0, separatorIndex).trim();
    const objectPath = value.slice(separatorIndex + 1).trim().replace(/^\/+/, '');
    if (!bucket || !objectPath) return null;
    if (!isAllowedResourceBucket(bucket)) return null;
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return { bucket, path: objectPath };
  }

  if (value.startsWith(`${DEFAULT_RESOURCE_BUCKET}/`)) {
    const objectPath = value.slice(DEFAULT_RESOURCE_BUCKET.length + 1);
    if (!isSafeStorageObjectPath(objectPath)) return null;
    return { bucket: DEFAULT_RESOURCE_BUCKET, path: objectPath };
  }

  if (!isSafeStorageObjectPath(value)) return null;
  return { bucket: DEFAULT_RESOURCE_BUCKET, path: value };
}

function getResourceContentType(storagePath) {
  const lowerPath = storagePath.toLowerCase();
  for (const [extension, contentType] of CONTENT_TYPE_BY_EXTENSION.entries()) {
    if (lowerPath.endsWith(extension)) return contentType;
  }
  return 'application/octet-stream';
}

function sanitizeInlineFileName(value) {
  if (typeof value !== 'string') return 'material';
  const fileName = value.split('/').pop()?.trim() || 'material';
  return fileName.replace(/["\r\n\\]/g, '').slice(0, 180) || 'material';
}

function getAllowedFrameAncestors() {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
    ...(!isProduction ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : []),
  ];
  const origins = new Set(["'self'"]);

  for (const rawOrigin of rawOrigins) {
    const value = typeof rawOrigin === 'string' ? rawOrigin.trim() : '';
    if (!value) continue;

    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        origins.add(url.origin);
        // Robustness: automatically allow both apex and www subdomains for CSP frame-ancestors
        if (url.hostname.startsWith('www.')) {
          const apex = url.hostname.slice(4);
          origins.add(`${url.protocol}//${apex}`);
        } else if (!url.hostname.startsWith('localhost') && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
          origins.add(`${url.protocol}//www.${url.hostname}`);
        }
      }
    } catch {
      // Ignore malformed deployment values; CORS validation handles them elsewhere.
    }
  }

  return Array.from(origins).join(' ');
}

function applyResourceSecurityHeaders(res, storageReference, upstreamHeaders) {
  res.removeHeader('X-Frame-Options');
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Content-Security-Policy', `frame-ancestors ${getAllowedFrameAncestors()}`);
  res.set('Content-Disposition', `inline; filename="${sanitizeInlineFileName(storageReference.path)}"`);
  res.set(
    'Access-Control-Expose-Headers',
    'Accept-Ranges, Content-Length, Content-Range, Content-Type'
  );

  const upstreamContentType = upstreamHeaders.get('content-type');
  res.set('Content-Type', upstreamContentType || getResourceContentType(storageReference.path));
}

function copyHeader(sourceHeaders, targetResponse, sourceName, targetName = sourceName) {
  const value = sourceHeaders.get(sourceName);
  if (value) targetResponse.set(targetName, value);
}

async function streamResourceStorageObject({ req, res, storageReference }) {
  const rangeHeader = getForwardableRangeHeader(req);
  const upstreamResponse = await fetchStorageObject(storageReference, { rangeHeader });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    console.error('[Resource Storage Service] Storage stream failed:', upstreamResponse.status);
    const error = new Error('Could not stream course resource.');
    error.status = 502;
    throw error;
  }

  applyResourceSecurityHeaders(res, storageReference, upstreamResponse.headers);
  res.status(upstreamResponse.status);
  copyHeader(upstreamResponse.headers, res, 'content-length', 'Content-Length');
  copyHeader(upstreamResponse.headers, res, 'content-range', 'Content-Range');
  copyHeader(upstreamResponse.headers, res, 'etag', 'ETag');
  copyHeader(upstreamResponse.headers, res, 'last-modified', 'Last-Modified');

  if (!upstreamResponse.body) {
    return res.end();
  }

  return Readable.fromWeb(upstreamResponse.body).pipe(res);
}

module.exports = {
  resolveResourceStorageReference,
  streamResourceStorageObject,
};
