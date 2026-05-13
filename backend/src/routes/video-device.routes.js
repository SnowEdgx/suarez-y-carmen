const express = require('express');
const router = express.Router();
const videoDeviceController = require('../controllers/video-device.controller');

router.get('/', videoDeviceController.listVideoDevices);
router.post('/:deviceId/revoke', videoDeviceController.revokeVideoDevice);

module.exports = router;
