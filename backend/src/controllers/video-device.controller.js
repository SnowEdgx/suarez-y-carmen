const { getAuthenticatedUser, isEmailVerified } = require('../utils/auth');
const { isUuid } = require('../utils/validation');
const {
  getPlaybackDeviceId,
  listVideoDevicesForUser,
  revokeVideoDeviceForUser,
} = require('../services/video-device.service');

function getPublicDeviceErrorMessage(code) {
  if (code === 'invalid_device_id') return 'No pudimos identificar el dispositivo.';
  if (code === 'missing_current_device_id') return 'No pudimos validar este dispositivo.';
  if (code === 'device_not_found') return 'Dispositivo no encontrado.';
  if (code === 'current_device_not_revocable') return 'No puedes revocar el dispositivo actual desde aqu\u00ed.';
  return 'No pudimos completar la operaci\u00f3n sobre el dispositivo.';
}

exports.listVideoDevices = async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesi\u00f3n para gestionar tus dispositivos.' });
    }
    if (!isEmailVerified(user)) {
      return res.status(403).json({ error: 'Verifica tu correo para gestionar tus dispositivos.' });
    }

    const deviceSummary = await listVideoDevicesForUser({
      userId: user.id,
      currentDeviceId: getPlaybackDeviceId(req),
    });
    return res.json(deviceSummary);
  } catch (err) {
    console.error('[Video Device Controller] Error listing devices:', err.message);
    return res.status(500).json({ error: 'No pudimos cargar tus dispositivos.' });
  }
};

exports.revokeVideoDevice = async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesi\u00f3n para gestionar tus dispositivos.' });
    }
    if (!isEmailVerified(user)) {
      return res.status(403).json({ error: 'Verifica tu correo para gestionar tus dispositivos.' });
    }

    const deviceRowId = typeof req.params.deviceId === 'string' ? req.params.deviceId.trim() : '';
    if (!isUuid(deviceRowId)) {
      return res.status(400).json({ error: 'No pudimos identificar el dispositivo.' });
    }

    const currentDeviceId = getPlaybackDeviceId(req);
    if (!currentDeviceId) {
      return res.status(403).json({ error: 'No pudimos validar este dispositivo.' });
    }

    const result = await revokeVideoDeviceForUser({
      userId: user.id,
      deviceRowId,
      currentDeviceId,
    });
    return res.json(result);
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: getPublicDeviceErrorMessage(err.code) });
    }

    console.error('[Video Device Controller] Error revoking device:', err.message);
    return res.status(500).json({ error: 'No pudimos revocar el dispositivo.' });
  }
};
