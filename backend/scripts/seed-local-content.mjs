import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || 'course-videos';
const DEMO_VIDEO_SOURCE_URL =
  process.env.SEED_VIDEO_SOURCE_URL ||
  'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/hero.mp4';

const ASSETS = {
  IMG_2681: 'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/IMG_2681.jpeg',
  IMG_4784: 'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/IMG_4784.jpeg',
};

const COURSE_SEEDS = [
  {
    fallbackId: '11111111-1111-4111-8111-111111111111',
    title: 'Bachata Sensual: Desde Cero',
    slug: 'bachata-sensual-basico',
    description: 'Fundamentos tecnicos para construir una base clara de bachata sensual.',
    cover_image_url: ASSETS.IMG_2681,
    level: 'B\u00e1sico',
    price_cents: 2900,
    is_published: true,
    lessons: [
      {
        fallbackId: '21111111-1111-4111-8111-111111111111',
        title: 'Base, postura y conexion',
        description: 'Preview del curso con los puntos clave de postura y conexion inicial.',
        position: 1,
        duration_seconds: 420,
        is_free_preview: true,
        video_storage_path: 'demo/bachata-sensual-basico/01-base-postura-conexion.mp4',
      },
      {
        fallbackId: '21111111-1111-4111-8111-111111111112',
        title: 'Ondas basicas y control corporal',
        description: 'Trabajo progresivo de ondas con foco en control, respiracion y timing.',
        position: 2,
        duration_seconds: 840,
        is_free_preview: false,
        video_storage_path: 'demo/bachata-sensual-basico/02-ondas-basicas.mp4',
      },
      {
        fallbackId: '21111111-1111-4111-8111-111111111113',
        title: 'Combinacion guiada de fundamentos',
        description: 'Secuencia completa para integrar base, ondas y cambios de peso.',
        position: 3,
        duration_seconds: 960,
        is_free_preview: false,
        video_storage_path: 'demo/bachata-sensual-basico/03-combinacion-fundamentos.mp4',
      },
    ],
  },
  {
    fallbackId: '11111111-1111-4111-8111-111111111112',
    title: 'Figuras Avanzadas y Musicalidad',
    slug: 'figuras-avanzadas',
    description: 'Recursos para interpretar la musica y construir figuras con cambios de energia.',
    cover_image_url: ASSETS.IMG_4784,
    level: 'Avanzado',
    price_cents: 3900,
    is_published: true,
    lessons: [
      {
        fallbackId: '21111111-1111-4111-8111-111111111121',
        title: 'Musicalidad y cortes',
        description: 'Preview sobre lectura musical y preparacion de cortes.',
        position: 1,
        duration_seconds: 480,
        is_free_preview: true,
        video_storage_path: 'demo/figuras-avanzadas/01-musicalidad-cortes.mp4',
      },
      {
        fallbackId: '21111111-1111-4111-8111-111111111122',
        title: 'Cambios de energia',
        description: 'Como modular energia, velocidad e intencion dentro de una figura.',
        position: 2,
        duration_seconds: 900,
        is_free_preview: false,
        video_storage_path: 'demo/figuras-avanzadas/02-cambios-energia.mp4',
      },
      {
        fallbackId: '21111111-1111-4111-8111-111111111123',
        title: 'Figura avanzada guiada',
        description: 'Construccion paso a paso de una figura con enfasis musical.',
        position: 3,
        duration_seconds: 1020,
        is_free_preview: false,
        video_storage_path: 'demo/figuras-avanzadas/03-figura-avanzada-guiada.mp4',
      },
    ],
  },
];

const EVENT_SEEDS = [
  {
    fallbackId: '31111111-1111-4111-8111-111111111111',
    title: 'Madrid Bachata Festival',
    city: 'Madrid',
    event_date: '2026-06-20T10:00:00.000Z',
    type: 'Congreso',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
  {
    fallbackId: '31111111-1111-4111-8111-111111111112',
    title: 'Taller Intensivo: Ondas y Body Rolls',
    city: 'Malaga',
    event_date: '2026-07-04T17:00:00.000Z',
    type: 'Taller',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
  {
    fallbackId: '31111111-1111-4111-8111-111111111113',
    title: 'Bootcamp Bachata Sensual',
    city: 'Sevilla',
    event_date: '2026-08-08T09:30:00.000Z',
    type: 'Taller',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
];

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

function resolveSupabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }
  return rawUrl;
}

function assertNoError(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

async function findExistingId(table, column, value) {
  const result = await supabase
    .from(table)
    .select('id')
    .eq(column, value)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Could not query ${table}.${column}: ${result.error.message}`);
  }

  return result.data?.id || null;
}

async function upsertCourse(courseSeed) {
  const existingId = await findExistingId('courses', 'slug', courseSeed.slug);
  const id = existingId || courseSeed.fallbackId;

  assertNoError(
    await supabase
      .from('courses')
      .upsert(
        {
          id,
          title: courseSeed.title,
          slug: courseSeed.slug,
          description: courseSeed.description,
          cover_image_url: courseSeed.cover_image_url,
          level: courseSeed.level,
          price_cents: courseSeed.price_cents,
          is_published: courseSeed.is_published,
        },
        { onConflict: 'id' }
      ),
    `Could not upsert course ${courseSeed.slug}`
  );

  return id;
}

async function upsertLesson(courseId, lessonSeed) {
  const existing = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('position', lessonSeed.position)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Could not query lesson ${lessonSeed.title}: ${existing.error.message}`);
  }

  const id = existing.data?.id || lessonSeed.fallbackId;

  assertNoError(
    await supabase
      .from('lessons')
      .upsert(
        {
          id,
          course_id: courseId,
          title: lessonSeed.title,
          description: lessonSeed.description,
          video_url: `${VIDEO_BUCKET}/${lessonSeed.video_storage_path}`,
          video_storage_path: lessonSeed.video_storage_path,
          duration_seconds: lessonSeed.duration_seconds,
          position: lessonSeed.position,
          is_free_preview: lessonSeed.is_free_preview,
        },
        { onConflict: 'id' }
      ),
    `Could not upsert lesson ${lessonSeed.title}`
  );
}

async function upsertEvent(eventSeed) {
  const existingId = await findExistingId('events', 'title', eventSeed.title);
  const id = existingId || eventSeed.fallbackId;

  assertNoError(
    await supabase
      .from('events')
      .upsert(
        {
          id,
          title: eventSeed.title,
          city: eventSeed.city,
          event_date: eventSeed.event_date,
          type: eventSeed.type,
          is_active: eventSeed.is_active,
          ticket_url: eventSeed.ticket_url,
        },
        { onConflict: 'id' }
      ),
    `Could not upsert event ${eventSeed.title}`
  );
}

async function ensureVideoBucket() {
  const bucket = await supabase.storage.getBucket(VIDEO_BUCKET);
  if (!bucket.error) return;

  const created = await supabase.storage.createBucket(VIDEO_BUCKET, {
    public: false,
  });

  if (created.error && created.error.message !== 'Bucket already exists') {
    throw new Error(`Could not create storage bucket ${VIDEO_BUCKET}: ${created.error.message}`);
  }
}

async function downloadDemoVideo() {
  const response = await fetch(DEMO_VIDEO_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Could not download demo video (${response.status}) from ${DEMO_VIDEO_SOURCE_URL}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadDemoVideos() {
  if (process.env.SKIP_DEMO_VIDEO_UPLOAD === '1') {
    console.log('[seed] Skipping demo video upload because SKIP_DEMO_VIDEO_UPLOAD=1.');
    return;
  }

  await ensureVideoBucket();
  const videoBuffer = await downloadDemoVideo();
  const paths = COURSE_SEEDS.flatMap((course) =>
    course.lessons.map((lesson) => lesson.video_storage_path)
  );

  for (const objectPath of paths) {
    const result = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(objectPath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    assertNoError(result, `Could not upload demo video ${objectPath}`);
  }
}

loadEnvFile(path.join(repoRoot, 'backend', '.env.local'));

const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL || 'http://127.0.0.1:54321');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase admin credentials. Define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.local.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('[seed] Seeding local courses, lessons, events and demo private videos...');

for (const courseSeed of COURSE_SEEDS) {
  const courseId = await upsertCourse(courseSeed);
  for (const lessonSeed of courseSeed.lessons) {
    await upsertLesson(courseId, lessonSeed);
  }
}

for (const eventSeed of EVENT_SEEDS) {
  await upsertEvent(eventSeed);
}

await uploadDemoVideos();

console.log('[seed] Local content seed completed.');
