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

const HOME_CONTENT_SEED = {
  hero_eyebrow: 'Academia online de bachata',
  hero_title: 'Master the head movements.',
  hero_subtitle:
    'Domina la sensualidad, el estilo y la conexión con Suárez y Carmen. Aprende desde casa paso a paso con cursos individuales y acceso inmediato.',
  hero_video_url: DEMO_VIDEO_SOURCE_URL,
  primary_cta_label: 'Ver catálogo',
  primary_cta_href: '/courses',
  secondary_cta_label: 'Ver metodología',
  secondary_cta_href: '#methodology',
  is_published: true,
};

const FAQ_SEEDS = [
  {
    fallbackId: '41111111-1111-4111-8111-111111111111',
    question: 'Cómo se compra un curso',
    answer:
      'Cada curso se compra de forma individual desde el catálogo. Tras el pago validado, el acceso queda activado en tu cuenta.',
    position: 10,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111112',
    question: 'Cómo accedo al contenido comprado',
    answer:
      'Inicia sesión con tu cuenta verificada y entra en el detalle del curso. Si el pago está confirmado, las lecciones completas aparecen desbloqueadas.',
    position: 20,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111113',
    question: 'Qué acceso incluye la compra',
    answer:
      'La compra desbloquea las lecciones completas del curso adquirido y permite guardar tu progreso dentro de la cuenta.',
    position: 30,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111114',
    question: 'Los eventos presenciales se pagan aquí',
    answer: 'No. La plataforma redirige a la ticketera oficial del evento cuando corresponda.',
    position: 40,
  },
];

const IN_PERSON_CLASS_SEEDS = [
  {
    fallbackId: '51111111-1111-4111-8111-111111111111',
    title: 'Clases regulares en Málaga',
    city: 'Málaga',
    venue: 'Sala por confirmar',
    schedule: 'Próximamente',
    description:
      'Información editable para comunicar clases presenciales, horarios y contacto sin modificar código.',
    image_url: ASSETS.IMG_2681,
    contact_url: 'https://www.instagram.com/suarezycarmenoficial/',
    position: 10,
    is_active: true,
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

async function upsertHomeContent() {
  assertNoError(
    await supabase
      .from('home_content')
      .upsert(
        {
          id: 'home',
          ...HOME_CONTENT_SEED,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ),
    'Could not upsert home content'
  );
}

async function upsertFaq(faqSeed) {
  const existingId = await findExistingId('faqs', 'question', faqSeed.question);
  const id = existingId || faqSeed.fallbackId;

  assertNoError(
    await supabase
      .from('faqs')
      .upsert(
        {
          id,
          question: faqSeed.question,
          answer: faqSeed.answer,
          position: faqSeed.position,
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ),
    `Could not upsert FAQ ${faqSeed.question}`
  );
}

async function upsertInPersonClass(classSeed) {
  const existingId = await findExistingId('in_person_classes', 'title', classSeed.title);
  const id = existingId || classSeed.fallbackId;

  assertNoError(
    await supabase
      .from('in_person_classes')
      .upsert(
        {
          id,
          title: classSeed.title,
          city: classSeed.city,
          venue: classSeed.venue,
          schedule: classSeed.schedule,
          description: classSeed.description,
          image_url: classSeed.image_url,
          contact_url: classSeed.contact_url,
          position: classSeed.position,
          is_active: classSeed.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ),
    `Could not upsert in-person class ${classSeed.title}`
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

console.log('[seed] Seeding local courses, lessons, public content, events and demo private videos...');

for (const courseSeed of COURSE_SEEDS) {
  const courseId = await upsertCourse(courseSeed);
  for (const lessonSeed of courseSeed.lessons) {
    await upsertLesson(courseId, lessonSeed);
  }
}

for (const eventSeed of EVENT_SEEDS) {
  await upsertEvent(eventSeed);
}

await upsertHomeContent();

for (const faqSeed of FAQ_SEEDS) {
  await upsertFaq(faqSeed);
}

for (const classSeed of IN_PERSON_CLASS_SEEDS) {
  await upsertInPersonClass(classSeed);
}

await uploadDemoVideos();

console.log('[seed] Local content seed completed.');
