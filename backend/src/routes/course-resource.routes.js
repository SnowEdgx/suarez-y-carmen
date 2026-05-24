const express = require('express');
const router = express.Router();
const courseResourceController = require('../controllers/course-resource.controller');
const { createIpRateLimit } = require('../utils/rate-limit');

const RESOURCE_URL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RESOURCE_URL_RATE_LIMIT_MAX_REQUESTS = 120;
const resourceUrlRateLimit = createIpRateLimit({
  windowMs: RESOURCE_URL_RATE_LIMIT_WINDOW_MS,
  maxRequests: RESOURCE_URL_RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas solicitudes. Int\u00e9ntalo de nuevo en un minuto.',
  code: 'resource_rate_limited',
});

router.get('/:resourceId/view-url', resourceUrlRateLimit, courseResourceController.getCourseResourceViewUrl);
router.get('/view/:token', resourceUrlRateLimit, courseResourceController.viewCourseResource);

module.exports = router;
