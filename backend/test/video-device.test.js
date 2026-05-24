process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'local-test-service-role-key';
process.env.VIDEO_AUDIT_HASH_SECRET ||= 'local-test-video-audit-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isVideoDeviceActive } = require('../src/services/video-device.service');

test('isVideoDeviceActive matches the active-device cutoff rule', () => {
  const activeCutoffMs = Date.parse('2026-05-01T00:00:00.000Z');

  assert.equal(
    isVideoDeviceActive(
      {
        first_seen_at: '2026-04-01T00:00:00.000Z',
        last_seen_at: '2026-05-02T00:00:00.000Z',
        revoked_at: null,
      },
      activeCutoffMs
    ),
    true
  );

  assert.equal(
    isVideoDeviceActive(
      {
        first_seen_at: '2026-04-01T00:00:00.000Z',
        last_seen_at: '2026-04-30T23:59:59.000Z',
        revoked_at: null,
      },
      activeCutoffMs
    ),
    false
  );

  assert.equal(
    isVideoDeviceActive(
      {
        first_seen_at: '2026-05-02T00:00:00.000Z',
        last_seen_at: '2026-05-02T00:00:00.000Z',
        revoked_at: '2026-05-03T00:00:00.000Z',
      },
      activeCutoffMs
    ),
    false
  );
});
