const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');

const CMS_SYNC_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CMS_SYNC_RATE_LIMIT_MAX_REQUESTS = 120;
const syncRequestBuckets = new Map();
const parseCmsJson = express.json({ limit: '250kb' });

function getRequestIp(req) {
  // Express resolves proxy headers according to app-level trust proxy settings.
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function syncRateLimit(req, res, next) {
  const ip = getRequestIp(req);
  const now = Date.now();

  const bucket = syncRequestBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= CMS_SYNC_RATE_LIMIT_WINDOW_MS) {
    syncRequestBuckets.set(ip, { windowStart: now, count: 1 });
    return next();
  }

  if (bucket.count >= CMS_SYNC_RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many CMS sync requests.' });
  }

  bucket.count += 1;
  syncRequestBuckets.set(ip, bucket);
  return next();
}

function parseCmsJsonSafely(req, res, next) {
  parseCmsJson(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
    return next();
  });
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of syncRequestBuckets.entries()) {
    if (now - bucket.windowStart >= CMS_SYNC_RATE_LIMIT_WINDOW_MS * 2) {
      syncRequestBuckets.delete(ip);
    }
  }
}, CMS_SYNC_RATE_LIMIT_WINDOW_MS).unref();

router.post('/sync', syncRateLimit, parseCmsJsonSafely, cmsController.syncContent);

module.exports = router;
