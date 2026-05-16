const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lesson.controller');
const { createIpRateLimit } = require('../utils/rate-limit');

const VIDEO_URL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VIDEO_URL_RATE_LIMIT_MAX_REQUESTS = 120;
const videoUrlRateLimit = createIpRateLimit({
  windowMs: VIDEO_URL_RATE_LIMIT_WINDOW_MS,
  maxRequests: VIDEO_URL_RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.',
});

router.get('/playback/:token', videoUrlRateLimit, lessonController.streamLessonVideo);
router.get('/hls/:token/manifest', videoUrlRateLimit, lessonController.serveHlsManifest);
router.get('/hls/:token/resource', videoUrlRateLimit, lessonController.serveHlsResource);
router.get('/:lessonId/video-url', videoUrlRateLimit, lessonController.getLessonVideoUrl);

module.exports = router;
