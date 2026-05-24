const express = require('express');
const router = express.Router();
const videoDeviceController = require('../controllers/video-device.controller');
const { createIpRateLimit } = require('../utils/rate-limit');

const VIDEO_DEVICE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VIDEO_DEVICE_RATE_LIMIT_MAX_REQUESTS = 60;
const videoDeviceRateLimit = createIpRateLimit({
  windowMs: VIDEO_DEVICE_RATE_LIMIT_WINDOW_MS,
  maxRequests: VIDEO_DEVICE_RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.',
  code: 'video_device_rate_limited',
});

router.get('/', videoDeviceRateLimit, videoDeviceController.listVideoDevices);
router.post('/:deviceId/revoke', videoDeviceRateLimit, videoDeviceController.revokeVideoDevice);

module.exports = router;
