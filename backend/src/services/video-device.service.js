const { createHmac } = require('crypto');
const { supabase, supabaseServiceKey } = require('../config/supabase');
const { getUserAgent } = require('../utils/request');
const { UUID_REGEX, isSha256Hash, isUuid } = require('../utils/validation');

const isProduction = process.env.NODE_ENV === 'production';
const VIDEO_AUDIT_HASH_SECRET =
  process.env.VIDEO_AUDIT_HASH_SECRET ||
  process.env.VIDEO_PLAYBACK_TOKEN_SECRET ||
  supabaseServiceKey;

if (isProduction && !process.env.VIDEO_AUDIT_HASH_SECRET) {
  throw new Error('VIDEO_AUDIT_HASH_SECRET is required in production.');
}

const RAW_MAX_ACTIVE_VIDEO_DEVICES = Number.parseInt(
  process.env.VIDEO_MAX_ACTIVE_DEVICES || '2',
  10
);
const MAX_ACTIVE_VIDEO_DEVICES =
  Number.isInteger(RAW_MAX_ACTIVE_VIDEO_DEVICES) && RAW_MAX_ACTIVE_VIDEO_DEVICES >= 1
    ? Math.min(RAW_MAX_ACTIVE_VIDEO_DEVICES, 10)
    : 2;
const RAW_VIDEO_DEVICE_INACTIVITY_DAYS = Number.parseInt(
  process.env.VIDEO_DEVICE_INACTIVITY_DAYS || '30',
  10
);
const VIDEO_DEVICE_INACTIVITY_DAYS =
  Number.isInteger(RAW_VIDEO_DEVICE_INACTIVITY_DAYS) && RAW_VIDEO_DEVICE_INACTIVITY_DAYS >= 1
    ? Math.min(RAW_VIDEO_DEVICE_INACTIVITY_DAYS, 365)
    : 30;

function createDeviceError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
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

function getActiveDeviceCutoffIso() {
  return new Date(
    Date.now() - VIDEO_DEVICE_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
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

async function assertVideoDeviceAccess({ req, userId }) {
  const deviceId = getPlaybackDeviceId(req);
  if (!deviceId) {
    throw createDeviceError(403, 'missing_device_id', 'Video device identifier is required.');
  }

  const deviceIdHash = hashRequestValue(deviceId);
  const userAgentHash = hashRequestValue(getUserAgent(req));

  const { data: existingDevice, error: existingDeviceError } = await supabase
    .from('user_video_devices')
    .select('id, revoked_at')
    .eq('user_id', userId)
    .eq('device_id_hash', deviceIdHash)
    .maybeSingle();

  if (existingDeviceError) throw existingDeviceError;

  if (existingDevice?.revoked_at) {
    throw createDeviceError(403, 'device_revoked', 'Video device has been revoked.');
  }

  if (existingDevice) {
    const { error: updateError } = await supabase
      .from('user_video_devices')
      .update({
        user_agent_hash: userAgentHash,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existingDevice.id);

    if (updateError) throw updateError;
    return { deviceIdHash };
  }

  const { count, error: countError } = await supabase
    .from('user_video_devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gte('last_seen_at', getActiveDeviceCutoffIso());

  if (countError) throw countError;

  if ((count || 0) >= MAX_ACTIVE_VIDEO_DEVICES) {
    throw createDeviceError(403, 'device_limit_exceeded', 'User has reached the active video device limit.');
  }

  const { error: insertError } = await supabase
    .from('user_video_devices')
    .insert({
      user_id: userId,
      device_id_hash: deviceIdHash,
      user_agent_hash: userAgentHash,
    });

  if (insertError) throw insertError;
  return { deviceIdHash };
}

async function assertPlaybackDeviceStillActive({ userId, deviceIdHash }) {
  if (!userId) return;

  if (!isSha256Hash(deviceIdHash)) {
    throw createDeviceError(403, 'missing_token_device_hash', 'Playback token is missing a valid device hash.');
  }

  const { data, error: deviceError } = await supabase
    .from('user_video_devices')
    .select('id, revoked_at')
    .eq('user_id', userId)
    .eq('device_id_hash', deviceIdHash)
    .maybeSingle();

  if (deviceError) throw deviceError;

  if (!data || data.revoked_at) {
    throw createDeviceError(403, 'playback_device_revoked', 'Playback device is no longer active.');
  }
}

async function listVideoDevicesForUser({ userId, currentDeviceId }) {
  const currentDeviceHash = currentDeviceId ? hashRequestValue(currentDeviceId) : null;

  const { data, error } = await supabase
    .from('user_video_devices')
    .select('id, device_id_hash, first_seen_at, last_seen_at, revoked_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) throw error;

  const devices = (data || []).map((row) => normalizeDevice(row, currentDeviceHash));
  return {
    devices,
    activeDeviceCount: devices.filter((device) => device.isActive).length,
    maxActiveDevices: MAX_ACTIVE_VIDEO_DEVICES,
  };
}

async function revokeVideoDeviceForUser({ userId, deviceRowId, currentDeviceId }) {
  if (!isUuid(deviceRowId)) {
    throw createDeviceError(400, 'invalid_device_id', 'Video device row id is invalid.');
  }

  if (!currentDeviceId) {
    throw createDeviceError(403, 'missing_current_device_id', 'Current video device identifier is required.');
  }

  const currentDeviceHash = hashRequestValue(currentDeviceId);
  const { data: device, error: readError } = await supabase
    .from('user_video_devices')
    .select('id, device_id_hash, revoked_at')
    .eq('id', deviceRowId)
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) throw readError;
  if (!device) {
    throw createDeviceError(404, 'device_not_found', 'Video device was not found.');
  }

  if (device.revoked_at) {
    return { revoked: true };
  }

  if (device.device_id_hash === currentDeviceHash) {
    throw createDeviceError(409, 'current_device_not_revocable', 'Current video device cannot be revoked here.');
  }

  const { error: updateError } = await supabase
    .from('user_video_devices')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', device.id)
    .eq('user_id', userId);

  if (updateError) throw updateError;
  return { revoked: true };
}

module.exports = {
  MAX_ACTIVE_VIDEO_DEVICES,
  assertPlaybackDeviceStillActive,
  assertVideoDeviceAccess,
  getPlaybackDeviceId,
  hashRequestValue,
  listVideoDevicesForUser,
  revokeVideoDeviceForUser,
};
