import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_LOCAL_BACKEND_URL = 'http://localhost:4000';
const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_CMS_SYNC_TOKEN = 'local-cms-sync-token-change-me';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && typeof process.env[key] === 'undefined') {
      process.env[key] = value;
    }
  }
}

loadEnvFile(new URL('../.env.local', import.meta.url));

function normalizeUrl(value) {
  return value.replace(/\/+$/, '');
}

function resolveSupabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  return rawUrl.includes('host.docker.internal')
    ? rawUrl.replace('host.docker.internal', '127.0.0.1')
    : rawUrl;
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', 'host.docker.internal'].includes(url.hostname);
  } catch {
    return false;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function postSync(backendUrl, token, payload) {
  const response = await fetch(`${backendUrl}/api/cms/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return {
    response,
    body: await readJson(response),
  };
}

function assertStatus(result, expectedStatus, label) {
  if (result.response.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus}, received ${result.response.status}: ${JSON.stringify(result.body)}`);
  }
}

async function assertSingle(supabase, table, cmsDocumentId, label) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('cms_document_id', cmsDocumentId)
    .maybeSingle();

  if (error) throw new Error(`${label} read failed: ${error.message}`);
  if (!data) throw new Error(`${label} was not synced.`);
  return data;
}

async function cleanup(supabase, identifiers) {
  await supabase.from('lessons').delete().eq('cms_document_id', identifiers.lessonDocumentId);
  await supabase.from('events').delete().eq('cms_document_id', identifiers.eventDocumentId);
  await supabase.from('courses').delete().eq('cms_document_id', identifiers.courseDocumentId);
}

async function main() {
  const backendUrl = normalizeUrl(process.env.BACKEND_URL || DEFAULT_LOCAL_BACKEND_URL);
  const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL || DEFAULT_LOCAL_SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required.');
  }

  const cmsSyncToken = process.env.CMS_SYNC_TOKEN ||
    (isLocalUrl(backendUrl) ? DEFAULT_LOCAL_CMS_SYNC_TOKEN : requireEnv('CMS_SYNC_TOKEN'));
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const stamp = Date.now();
  const identifiers = {
    courseDocumentId: `cms-course-e2e-${stamp}`,
    lessonDocumentId: `cms-lesson-e2e-${stamp}`,
    eventDocumentId: `cms-event-e2e-${stamp}`,
  };
  const courseSlug = `cms-sync-e2e-${stamp}`;

  try {
    const unauthorized = await postSync(backendUrl, 'invalid-token', {
      model: 'course',
      action: 'upsert',
      entry: {},
    });
    assertStatus(unauthorized, 401, 'Unauthorized CMS sync');

    const courseUpsert = await postSync(backendUrl, cmsSyncToken, {
      model: 'course',
      action: 'upsert',
      entry: {
        cmsDocumentId: identifiers.courseDocumentId,
        cmsEntryId: String(stamp),
        title: 'CMS Sync E2E',
        slug: courseSlug,
        description: 'Local CMS sync verification course.',
        level: 'Básico',
        priceCents: 2900,
        coverImageUrl: 'http://localhost:1337/uploads/cms-sync-e2e.jpg',
        isPublished: true,
      },
    });
    assertStatus(courseUpsert, 200, 'Course CMS sync');

    const syncedCourse = await assertSingle(supabase, 'courses', identifiers.courseDocumentId, 'Course');
    if (syncedCourse.slug !== courseSlug || syncedCourse.is_published !== true) {
      throw new Error('Course sync did not persist the expected slug and publication state.');
    }

    const courseUpdate = await postSync(backendUrl, cmsSyncToken, {
      model: 'course',
      action: 'upsert',
      entry: {
        cmsDocumentId: identifiers.courseDocumentId,
        cmsEntryId: String(stamp),
        title: 'CMS Sync E2E Updated',
        slug: courseSlug,
        description: 'Updated local CMS sync verification course.',
        level: 'Intermedio',
        priceCents: 3900,
        coverImageUrl: 'http://localhost:1337/uploads/cms-sync-e2e-updated.jpg',
        isPublished: true,
      },
    });
    assertStatus(courseUpdate, 200, 'Course update CMS sync');

    const updatedCourse = await assertSingle(supabase, 'courses', identifiers.courseDocumentId, 'Updated course');
    if (updatedCourse.title !== 'CMS Sync E2E Updated' || updatedCourse.price_cents !== 3900) {
      throw new Error('Course update did not persist expected fields.');
    }

    const lessonUpsert = await postSync(backendUrl, cmsSyncToken, {
      model: 'lesson',
      action: 'upsert',
      entry: {
        cmsDocumentId: identifiers.lessonDocumentId,
        cmsEntryId: String(stamp),
        courseDocumentId: identifiers.courseDocumentId,
        title: 'CMS Sync Lesson E2E',
        description: 'Local CMS sync verification lesson.',
        position: 1,
        durationSeconds: 120,
        isFreePreview: true,
        videoStoragePath: `demo/cms-sync-e2e-${stamp}.mp4`,
        isPublished: true,
      },
    });
    assertStatus(lessonUpsert, 200, 'Lesson CMS sync');

    const syncedLesson = await assertSingle(supabase, 'lessons', identifiers.lessonDocumentId, 'Lesson');
    if (syncedLesson.course_id !== updatedCourse.id || syncedLesson.is_published !== true) {
      throw new Error('Lesson sync did not link the expected course.');
    }

    const eventUpsert = await postSync(backendUrl, cmsSyncToken, {
      model: 'event',
      action: 'upsert',
      entry: {
        cmsDocumentId: identifiers.eventDocumentId,
        cmsEntryId: String(stamp),
        title: 'CMS Sync Event E2E',
        city: 'Málaga',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        type: 'Taller',
        imageUrl: 'http://localhost:1337/uploads/cms-sync-event-e2e.jpg',
        locationUrl: 'https://example.com/location',
        ticketUrl: 'https://example.com/tickets',
        isActive: true,
        isPublished: true,
      },
    });
    assertStatus(eventUpsert, 200, 'Event CMS sync');

    const syncedEvent = await assertSingle(supabase, 'events', identifiers.eventDocumentId, 'Event');
    if (syncedEvent.is_active !== true) {
      throw new Error('Event sync did not persist active state.');
    }

    const lessonDelete = await postSync(backendUrl, cmsSyncToken, {
      model: 'lesson',
      action: 'delete',
      entry: { cmsDocumentId: identifiers.lessonDocumentId },
    });
    assertStatus(lessonDelete, 200, 'Lesson unpublish CMS sync');

    const unpublishedLesson = await assertSingle(supabase, 'lessons', identifiers.lessonDocumentId, 'Unpublished lesson');
    if (unpublishedLesson.is_published !== false) {
      throw new Error('Lesson delete did not soft-unpublish the lesson.');
    }

    const courseDelete = await postSync(backendUrl, cmsSyncToken, {
      model: 'course',
      action: 'delete',
      entry: { cmsDocumentId: identifiers.courseDocumentId },
    });
    assertStatus(courseDelete, 200, 'Course unpublish CMS sync');

    const unpublishedCourse = await assertSingle(supabase, 'courses', identifiers.courseDocumentId, 'Unpublished course');
    if (unpublishedCourse.is_published !== false) {
      throw new Error('Course delete did not soft-unpublish the course.');
    }

    const eventDelete = await postSync(backendUrl, cmsSyncToken, {
      model: 'event',
      action: 'delete',
      entry: { cmsDocumentId: identifiers.eventDocumentId },
    });
    assertStatus(eventDelete, 200, 'Event unpublish CMS sync');

    const unpublishedEvent = await assertSingle(supabase, 'events', identifiers.eventDocumentId, 'Unpublished event');
    if (unpublishedEvent.is_active !== false) {
      throw new Error('Event delete did not deactivate the event.');
    }

    console.log(JSON.stringify({
      cmsSync: true,
      unauthorizedRejected: unauthorized.response.status === 401,
      courseSynced: Boolean(syncedCourse.id),
      courseUpdated: updatedCourse.price_cents === 3900,
      lessonSynced: Boolean(syncedLesson.id),
      lessonUnpublished: unpublishedLesson.is_published === false,
      eventSynced: Boolean(syncedEvent.id),
      eventUnpublished: unpublishedEvent.is_active === false,
    }, null, 2));
  } finally {
    await cleanup(supabase, identifiers);
  }
}

main().catch((error) => {
  console.error(`[CMS Sync E2E] ${error.message}`);
  process.exit(1);
});
