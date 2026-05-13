const { createHmac } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function resolveSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) return rawUrl;

  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }

  return rawUrl;
}

const resolvedSupabaseUrl = resolveSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!resolvedSupabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase env vars in video device controller (SUPABASE_URL and service role key).'
  );
}

const supabase = createClient(resolvedSupabaseUrl, supabaseServiceKey);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_AUDIT_HASH_SECRET =
  process.env.VIDEO_AUDIT_HASH_SECRET ||
  process.env.VIDEO_PLAYBACK_TOKEN_SECRET ||
  supabaseServiceKey;
const RAW_MAX_ACTIVE_VIDEO_DEVICES = Number.parseInt(
  process.env.VIDEO_MAX_ACTIVE_DEVICES || '2',
  10
);
const MAX_ACTIVE_VIDEO_DEVICES =
  Number.isInteger(RAW_MAX_ACTIVE_VIDEO_DEVICES) && RAW_MAX_ACTIVE_VIDEO_DEVICES >= 1
    ? Math.min(RAW_MAX_ACTIVE_VIDEO_DEVICES, 10)
    : 2;

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

function hashRequestValue(value) {
  if (typeof value !== 'string' || value.length === 0) return null;

  return createHmac('sha256', VIDEO_AUDIT_HASH_SECRET)
    .update(value)
    .digest('hex');
}

function getPlaybackDeviceId(req) {
  const headerValue = req.headers['x-syc-device-id'];
  const rawDeviceId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof rawDeviceId !== 'string') return null;

  const deviceId = rawDeviceId.trim();
  return UUID_REGEX.test(deviceId) ? deviceId : null;
}

function normalizeDevice(row, currentDeviceHash) {
  return {
    id: row.id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    isCurrent: Boolean(currentDeviceHash && row.device_id_hash === currentDeviceHash),
    isActive: !row.revoked_at,
  };
}

exports.listVideoDevices = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesi\u00f3n para gestionar tus dispositivos.' });
    }

    const deviceId = getPlaybackDeviceId(req);
    const currentDeviceHash = deviceId ? hashRequestValue(deviceId) : null;

    const { data, error } = await supabase
      .from('user_video_devices')
      .select('id, device_id_hash, first_seen_at, last_seen_at, revoked_at')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false });

    if (error) throw error;

    const devices = (data || []).map((row) => normalizeDevice(row, currentDeviceHash));
    const activeDeviceCount = devices.filter((device) => device.isActive).length;

    res.set('Cache-Control', 'no-store');
    return res.json({
      devices,
      activeDeviceCount,
      maxActiveDevices: MAX_ACTIVE_VIDEO_DEVICES,
    });
  } catch (err) {
    console.error('[Video Device Controller] Error listing devices:', err.message);
    return res.status(500).json({ error: 'No pudimos cargar tus dispositivos.' });
  }
};

exports.revokeVideoDevice = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesi\u00f3n para gestionar tus dispositivos.' });
    }

    const deviceRowId = typeof req.params.deviceId === 'string' ? req.params.deviceId.trim() : '';
    if (!UUID_REGEX.test(deviceRowId)) {
      return res.status(400).json({ error: 'No pudimos identificar el dispositivo.' });
    }

    const currentDeviceId = getPlaybackDeviceId(req);
    if (!currentDeviceId) {
      return res.status(403).json({ error: 'No pudimos validar este dispositivo.' });
    }

    const currentDeviceHash = hashRequestValue(currentDeviceId);
    const { data: device, error: readError } = await supabase
      .from('user_video_devices')
      .select('id, device_id_hash, revoked_at')
      .eq('id', deviceRowId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) throw readError;
    if (!device) {
      return res.status(404).json({ error: 'Dispositivo no encontrado.' });
    }

    if (device.revoked_at) {
      return res.json({ revoked: true });
    }

    if (device.device_id_hash === currentDeviceHash) {
      return res.status(409).json({ error: 'No puedes revocar el dispositivo actual desde aqu\u00ed.' });
    }

    const { error: updateError } = await supabase
      .from('user_video_devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', device.id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    res.set('Cache-Control', 'no-store');
    return res.json({ revoked: true });
  } catch (err) {
    console.error('[Video Device Controller] Error revoking device:', err.message);
    return res.status(500).json({ error: 'No pudimos revocar el dispositivo.' });
  }
};
