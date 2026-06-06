const { logger } = require('../utils/logger');
const { Readable } = require('stream');
const { getForwardableRangeHeader } = require('../utils/range-header');
const {
  fetchStorageObject,
  getHlsContentType,
  isHlsManifestPath,
  rewriteHlsManifest,
} = require('./video-storage.service');
const { recordPlaybackEventSafe } = require('./playback-audit.service');

function applyVideoSecurityHeaders(res) {
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set(
    'Access-Control-Expose-Headers',
    'Accept-Ranges, Content-Length, Content-Range, Content-Type'
  );
}

function sendVideoUnavailable(res, status = 500) {
  return res.status(status).json({ error: 'No se pudo cargar el vídeo en este momento.' });
}

function copyHeader(sourceHeaders, targetResponse, sourceName, targetName = sourceName) {
  const value = sourceHeaders.get(sourceName);
  if (value) targetResponse.set(targetName, value);
}

async function streamStorageObject({ req, res, storageReference, audit }) {
  const rangeHeader = getForwardableRangeHeader(req);
  const upstreamResponse = await fetchStorageObject(storageReference, { rangeHeader });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    logger.error('[Lesson Controller] Storage stream failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `storage_${upstreamResponse.status}`,
    });
    return sendVideoUnavailable(res, 502);
  }

  recordPlaybackEventSafe({
    ...audit,
    eventType: 'stream_started',
    statusCode: upstreamResponse.status,
  });

  applyVideoSecurityHeaders(res);
  res.status(upstreamResponse.status);
  copyHeader(upstreamResponse.headers, res, 'content-type', 'Content-Type');
  if (!upstreamResponse.headers.get('content-type')) {
    res.set('Content-Type', getHlsContentType(storageReference.path));
  }
  copyHeader(upstreamResponse.headers, res, 'content-length', 'Content-Length');
  copyHeader(upstreamResponse.headers, res, 'content-range', 'Content-Range');
  copyHeader(upstreamResponse.headers, res, 'etag', 'ETag');
  copyHeader(upstreamResponse.headers, res, 'last-modified', 'Last-Modified');

  if (!upstreamResponse.body) {
    return res.end();
  }

  return Readable.fromWeb(upstreamResponse.body).pipe(res);
}

async function serveHlsObject({ req, res, rawToken, resourceReference, rootReference, currentReference, audit }) {
  const isManifest = isHlsManifestPath(resourceReference.path);
  const rangeHeader = !isManifest ? getForwardableRangeHeader(req) : undefined;
  const upstreamResponse = await fetchStorageObject(resourceReference, { rangeHeader });

  if (!upstreamResponse.ok) {
    logger.error('[Lesson Controller] HLS storage fetch failed:', upstreamResponse.status);
    recordPlaybackEventSafe({
      ...audit,
      eventType: 'stream_error',
      statusCode: 502,
      errorCode: `hls_storage_${upstreamResponse.status}`,
    });
    return sendVideoUnavailable(res, 502);
  }

  recordPlaybackEventSafe({
    ...audit,
    eventType: 'stream_started',
    statusCode: upstreamResponse.status,
  });

  applyVideoSecurityHeaders(res);
  res.status(upstreamResponse.status);

  if (isManifest) {
    const manifestText = await upstreamResponse.text();
    const rewrittenManifest = rewriteHlsManifest({
      manifestText,
      rootReference,
      currentReference,
      rawToken,
    });
    res.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    return res.send(rewrittenManifest);
  }

  res.set('Content-Type', getHlsContentType(resourceReference.path));
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
  sendVideoUnavailable,
  serveHlsObject,
  streamStorageObject,
};
