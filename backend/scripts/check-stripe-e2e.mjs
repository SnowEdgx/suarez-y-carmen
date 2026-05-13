import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_BACKEND_URL = 'http://localhost:4000';
const DEFAULT_TARGET_COURSE_SLUG = 'bachata-sensual-basico';
const DEFAULT_UNOWNED_COURSE_SLUG = 'figuras-avanzadas';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveLocalUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }
  return rawUrl;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Stripe E2E checks.`);
  }
  return value;
}

function assertStatus(response, expectedStatus, context) {
  if (response.status !== expectedStatus) {
    throw new Error(`${context} returned ${response.status}, expected ${expectedStatus}.`);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function getCourseBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, price_cents')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    throw new Error(`Could not find published course "${slug}": ${error.message}`);
  }

  return data;
}

async function getLesson(supabase, courseId, isFreePreview) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, video_storage_path, video_url')
    .eq('course_id', courseId)
    .eq('is_free_preview', isFreePreview)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    const type = isFreePreview ? 'preview' : 'locked';
    throw new Error(`Could not find ${type} lesson for course ${courseId}: ${error.message}`);
  }

  return data;
}

function storagePathToVideoUrl(storagePath) {
  return `course-videos/${storagePath}`;
}

async function uploadHlsFixture(supabase) {
  const fixtureRoot = `e2e/hls-${Date.now()}`;
  const manifestPath = `${fixtureRoot}/master.m3u8`;
  const segmentPath = `${fixtureRoot}/segment0.ts`;
  const manifest = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:1',
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXTINF:1.0,',
    'segment0.ts',
    '#EXT-X-ENDLIST',
    '',
  ].join('\n');

  const manifestUpload = await supabase.storage
    .from('course-videos')
    .upload(manifestPath, Buffer.from(manifest, 'utf8'), {
      contentType: 'application/vnd.apple.mpegurl',
      upsert: true,
    });
  if (manifestUpload.error) throw manifestUpload.error;

  const segmentUpload = await supabase.storage
    .from('course-videos')
    .upload(segmentPath, Buffer.from([0x47, 0x40, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00]), {
      contentType: 'video/mp2t',
      upsert: true,
    });
  if (segmentUpload.error) throw segmentUpload.error;

  return { manifestPath, segmentPath };
}

async function withTemporaryLessonVideo(supabase, lesson, storagePath, callback) {
  const originalVideoStoragePath = lesson.video_storage_path;
  const originalVideoUrl = lesson.video_url;

  const { error: updateError } = await supabase
    .from('lessons')
    .update({
      video_storage_path: storagePath,
      video_url: storagePathToVideoUrl(storagePath),
    })
    .eq('id', lesson.id);
  if (updateError) throw updateError;

  try {
    return await callback();
  } finally {
    const { error: restoreError } = await supabase
      .from('lessons')
      .update({
        video_storage_path: originalVideoStoragePath,
        video_url: originalVideoUrl,
      })
      .eq('id', lesson.id);
    if (restoreError) throw restoreError;
  }
}

async function resetTargetCourseAccess(supabase, userId, courseId) {
  await supabase.from('user_progress').delete().eq('user_id', userId);
  await supabase.from('user_video_devices').delete().eq('user_id', userId);
  await supabase
    .from('user_courses')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
}

function buildCompletedCheckoutEvent({ checkoutSessionId, course, userId }) {
  const timestamp = Date.now();

  return {
    id: `evt_syc_e2e_${timestamp}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: checkoutSessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: course.price_cents,
        currency: 'eur',
        payment_intent: `pi_syc_e2e_${timestamp}`,
        metadata: {
          userId,
          courseId: course.id,
        },
        client_reference_id: userId,
      },
    },
  };
}

async function main() {
  loadEnvFile(path.join(repoRoot, 'backend', '.env.local'));
  loadEnvFile(path.join(repoRoot, 'frontend', '.env.local'));

  const backendUrl = (process.env.E2E_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  const supabaseUrl = resolveLocalUrl(requireEnv('SUPABASE_URL'));
  const supabaseAnonUrl = resolveLocalUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const stripeSecretKey = requireEnv('STRIPE_SECRET_KEY');
  const stripeWebhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
  const userEmail = requireEnv('E2E_USER_EMAIL');
  const userPassword = requireEnv('E2E_USER_PASSWORD');
  const targetCourseSlug = process.env.E2E_COURSE_SLUG || DEFAULT_TARGET_COURSE_SLUG;
  const unownedCourseSlug = process.env.E2E_UNOWNED_COURSE_SLUG || DEFAULT_UNOWNED_COURSE_SLUG;
  const videoDeviceId = randomUUID();
  const secondVideoDeviceId = randomUUID();

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required.');
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authClient = createClient(supabaseAnonUrl, anonKey);
  const stripe = new Stripe(stripeSecretKey);

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });
  if (signInError) {
    throw new Error(`Could not sign in E2E user: ${signInError.message}`);
  }

  const user = signInData.user;
  const token = signInData.session?.access_token;
  if (!user || !token) {
    throw new Error('Authenticated E2E session did not include a user and access token.');
  }

  const targetCourse = await getCourseBySlug(admin, targetCourseSlug);
  const unownedCourse = await getCourseBySlug(admin, unownedCourseSlug);
  await resetTargetCourseAccess(admin, user.id, targetCourse.id);

  const checkoutResponse = await fetch(`${backendUrl}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      courseId: targetCourse.id,
      returnPath: `/courses/${targetCourse.slug}`,
    }),
  });
  const checkoutPayload = await readJson(checkoutResponse);
  assertStatus(checkoutResponse, 200, 'Checkout creation');
  if (!checkoutPayload.id || !checkoutPayload.url) {
    throw new Error('Checkout creation did not return a session id and URL.');
  }

  const { data: pendingPurchase, error: pendingError } = await admin
    .from('user_courses')
    .select('status, amount_cents, stripe_checkout_session_id')
    .eq('user_id', user.id)
    .eq('course_id', targetCourse.id)
    .single();
  if (pendingError) throw pendingError;
  if (pendingPurchase.status !== 'pending') {
    throw new Error(`Expected pending purchase, received ${pendingPurchase.status}.`);
  }

  const event = buildCompletedCheckoutEvent({
    checkoutSessionId: checkoutPayload.id,
    course: targetCourse,
    userId: user.id,
  });
  const webhookPayload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: webhookPayload,
    secret: stripeWebhookSecret,
  });

  const webhookResponse = await fetch(`${backendUrl}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: webhookPayload,
  });
  const webhookResult = await readJson(webhookResponse);
  assertStatus(webhookResponse, 200, 'Webhook processing');
  if (webhookResult.received !== true) {
    throw new Error('Webhook did not acknowledge the event.');
  }

  const duplicateWebhookResponse = await fetch(`${backendUrl}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: webhookPayload,
  });
  const duplicateWebhookResult = await readJson(duplicateWebhookResponse);
  assertStatus(duplicateWebhookResponse, 200, 'Duplicate webhook processing');
  if (duplicateWebhookResult.duplicate !== true) {
    throw new Error('Duplicate webhook was not detected as idempotent.');
  }

  const { data: paidPurchase, error: paidError } = await admin
    .from('user_courses')
    .select('status, amount_cents, currency')
    .eq('user_id', user.id)
    .eq('course_id', targetCourse.id)
    .single();
  if (paidError) throw paidError;
  if (paidPurchase.status !== 'paid') {
    throw new Error(`Expected paid purchase, received ${paidPurchase.status}.`);
  }

  const lockedLesson = await getLesson(admin, targetCourse.id, false);
  const paidVideoWithoutDeviceResponse = await fetch(`${backendUrl}/api/lessons/${lockedLesson.id}/video-url`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assertStatus(paidVideoWithoutDeviceResponse, 403, 'Paid video access without device');

  const paidVideoResponse = await fetch(`${backendUrl}/api/lessons/${lockedLesson.id}/video-url`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SYC-Device-Id': videoDeviceId,
    },
  });
  const paidVideoPayload = await readJson(paidVideoResponse);
  assertStatus(paidVideoResponse, 200, 'Paid video access');
  if (paidVideoPayload.source !== 'proxied' || typeof paidVideoPayload.path !== 'string') {
    throw new Error('Paid video access did not return a proxied playback path.');
  }

  const playbackResponse = await fetch(`${backendUrl}${paidVideoPayload.path}`, {
    headers: { Range: 'bytes=0-1023' },
  });
  if (playbackResponse.status !== 200 && playbackResponse.status !== 206) {
    throw new Error(`Playback proxy returned ${playbackResponse.status}, expected 200 or 206.`);
  }

  const invalidRangeResponse = await fetch(`${backendUrl}${paidVideoPayload.path}`, {
    headers: { Range: 'bytes=-' },
  });
  assertStatus(invalidRangeResponse, 416, 'Invalid playback range');

  const hlsFixture = await uploadHlsFixture(admin);
  const hlsChecks = await withTemporaryLessonVideo(admin, lockedLesson, hlsFixture.manifestPath, async () => {
    const hlsVideoResponse = await fetch(`${backendUrl}/api/lessons/${lockedLesson.id}/video-url`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-SYC-Device-Id': videoDeviceId,
      },
    });
    const hlsVideoPayload = await readJson(hlsVideoResponse);
    assertStatus(hlsVideoResponse, 200, 'HLS video access');
    if (hlsVideoPayload.source !== 'hls' || typeof hlsVideoPayload.path !== 'string') {
      throw new Error('HLS video access did not return a protected manifest path.');
    }

    const manifestResponse = await fetch(`${backendUrl}${hlsVideoPayload.path}`);
    assertStatus(manifestResponse, 200, 'HLS manifest access');
    const manifestText = await manifestResponse.text();
    if (!manifestText.includes('/api/lessons/hls/') || manifestText.includes('\nsegment0.ts')) {
      throw new Error('HLS manifest was not rewritten to protected segment URLs.');
    }

    const segmentPath = manifestText
      .split(/\r?\n/)
      .find((line) => line.includes('/api/lessons/hls/') && line.includes('/resource?path='));
    if (!segmentPath) {
      throw new Error('HLS manifest did not include a protected segment resource path.');
    }

    const segmentResponse = await fetch(`${backendUrl}${segmentPath}`);
    assertStatus(segmentResponse, 200, 'HLS segment access');

    const hlsTokenMatch = hlsVideoPayload.path.match(/^\/api\/lessons\/hls\/([^/]+)\/manifest$/);
    if (!hlsTokenMatch) {
      throw new Error('HLS manifest path did not include a token.');
    }

    const traversalResponse = await fetch(
      `${backendUrl}/api/lessons/hls/${hlsTokenMatch[1]}/resource?path=${encodeURIComponent('../outside.ts')}`
    );
    assertStatus(traversalResponse, 400, 'HLS traversal resource access');

    return {
      hlsVideoAccess: hlsVideoResponse.status,
      hlsManifestAccess: manifestResponse.status,
      hlsSegmentAccess: segmentResponse.status,
      hlsTraversalBlocked: traversalResponse.status,
    };
  });

  const secondDeviceVideoResponse = await fetch(`${backendUrl}/api/lessons/${lockedLesson.id}/video-url`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SYC-Device-Id': secondVideoDeviceId,
    },
  });
  assertStatus(secondDeviceVideoResponse, 200, 'Second device paid video access');

  const devicesResponse = await fetch(`${backendUrl}/api/video-devices`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SYC-Device-Id': videoDeviceId,
    },
  });
  const devicesPayload = await readJson(devicesResponse);
  assertStatus(devicesResponse, 200, 'Video device listing');
  const devices = Array.isArray(devicesPayload.devices) ? devicesPayload.devices : [];
  const currentDevice = devices.find((device) => device.isCurrent === true);
  const revocableDevice = devices.find((device) => device.isCurrent !== true && device.isActive === true);
  if (!currentDevice || !revocableDevice?.id) {
    throw new Error('Video device listing did not include current and revocable devices.');
  }
  if (devices.some((device) => 'device_id_hash' in device || 'user_agent_hash' in device)) {
    throw new Error('Video device listing exposed internal hashes.');
  }

  const revokeDeviceResponse = await fetch(`${backendUrl}/api/video-devices/${revocableDevice.id}/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SYC-Device-Id': videoDeviceId,
    },
  });
  assertStatus(revokeDeviceResponse, 200, 'Video device revocation');

  const revokedDeviceVideoResponse = await fetch(`${backendUrl}/api/lessons/${lockedLesson.id}/video-url`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SYC-Device-Id': secondVideoDeviceId,
    },
  });
  assertStatus(revokedDeviceVideoResponse, 403, 'Revoked device paid video access');

  const unownedLockedLesson = await getLesson(admin, unownedCourse.id, false);
  const unownedVideoResponse = await fetch(
    `${backendUrl}/api/lessons/${unownedLockedLesson.id}/video-url`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-SYC-Device-Id': videoDeviceId,
      },
    }
  );
  assertStatus(unownedVideoResponse, 403, 'Unowned video access');

  const previewLesson = await getLesson(admin, targetCourse.id, true);
  const publicPreviewResponse = await fetch(`${backendUrl}/api/lessons/${previewLesson.id}/video-url`);
  assertStatus(publicPreviewResponse, 200, 'Public preview access');

  const unauthCheckoutResponse = await fetch(`${backendUrl}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: targetCourse.id }),
  });
  assertStatus(unauthCheckoutResponse, 401, 'Unauthenticated checkout');

  const duplicateCheckoutResponse = await fetch(`${backendUrl}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      courseId: targetCourse.id,
      returnPath: `/courses/${targetCourse.slug}`,
    }),
  });
  assertStatus(duplicateCheckoutResponse, 409, 'Duplicate checkout');

  const { count: purchaseRows, error: countError } = await admin
    .from('user_courses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('course_id', targetCourse.id);
  if (countError) throw countError;
  if (purchaseRows !== 1) {
    throw new Error(`Expected one purchase row, received ${purchaseRows}.`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: {
          authSession: true,
          checkoutCreated: checkoutResponse.status,
          pendingStored: pendingPurchase.status,
          webhookReceived: webhookResponse.status,
          duplicateWebhookIdempotent: duplicateWebhookResult.duplicate === true,
          finalPurchaseStatus: paidPurchase.status,
          purchaseRows,
          paidVideoWithoutDevice: paidVideoWithoutDeviceResponse.status,
          paidVideoAccess: paidVideoResponse.status,
          playbackProxyAccess: playbackResponse.status,
          invalidPlaybackRange: invalidRangeResponse.status,
          hlsVideoAccess: hlsChecks.hlsVideoAccess,
          hlsManifestAccess: hlsChecks.hlsManifestAccess,
          hlsSegmentAccess: hlsChecks.hlsSegmentAccess,
          hlsTraversalBlocked: hlsChecks.hlsTraversalBlocked,
          secondDeviceVideoAccess: secondDeviceVideoResponse.status,
          videoDeviceListing: devicesResponse.status,
          videoDeviceRevocation: revokeDeviceResponse.status,
          revokedDeviceVideoAccess: revokedDeviceVideoResponse.status,
          unownedVideoAccess: unownedVideoResponse.status,
          publicPreviewAccess: publicPreviewResponse.status,
          unauthenticatedCheckout: unauthCheckoutResponse.status,
          duplicateCheckout: duplicateCheckoutResponse.status,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
