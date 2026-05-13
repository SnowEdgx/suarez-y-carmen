const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lesson.controller');

const VIDEO_URL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VIDEO_URL_RATE_LIMIT_MAX_REQUESTS = 120;
const videoUrlRequestBuckets = new Map();

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function videoUrlRateLimit(req, res, next) {
  const ip = getRequestIp(req);
  const now = Date.now();

  const bucket = videoUrlRequestBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= VIDEO_URL_RATE_LIMIT_WINDOW_MS) {
    videoUrlRequestBuckets.set(ip, { windowStart: now, count: 1 });
    return next();
  }

  if (bucket.count >= VIDEO_URL_RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intentalo de nuevo en un minuto.' });
  }

  bucket.count += 1;
  videoUrlRequestBuckets.set(ip, bucket);
  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of videoUrlRequestBuckets.entries()) {
    if (now - bucket.windowStart >= VIDEO_URL_RATE_LIMIT_WINDOW_MS * 2) {
      videoUrlRequestBuckets.delete(ip);
    }
  }
}, VIDEO_URL_RATE_LIMIT_WINDOW_MS).unref();

router.get('/playback/:token', videoUrlRateLimit, lessonController.streamLessonVideo);
router.get('/:lessonId/video-url', videoUrlRateLimit, lessonController.getLessonVideoUrl);

module.exports = router;
