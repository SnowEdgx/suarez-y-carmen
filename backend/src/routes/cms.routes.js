const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');
const { createIpRateLimit } = require('../utils/rate-limit');

const CMS_SYNC_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CMS_SYNC_RATE_LIMIT_MAX_REQUESTS = 120;
const parseCmsJson = express.json({ limit: '250kb' });
const syncRateLimit = createIpRateLimit({
  windowMs: CMS_SYNC_RATE_LIMIT_WINDOW_MS,
  maxRequests: CMS_SYNC_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many CMS sync requests.',
});

function parseCmsJsonSafely(req, res, next) {
  parseCmsJson(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
    return next();
  });
}

router.post('/sync', syncRateLimit, parseCmsJsonSafely, cmsController.syncContent);

module.exports = router;
