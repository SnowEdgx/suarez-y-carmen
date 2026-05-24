import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || 'course-videos';
const RESOURCE_BUCKET = process.env.SUPABASE_RESOURCE_BUCKET || 'course-resources';
const DEMO_VIDEO_SOURCE_URL =
  process.env.SEED_VIDEO_SOURCE_URL ||
  'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/hero.mp4';

const PUBLIC_ASSET_BASE_URL = (
  process.env.SUPABASE_PUBLIC_ASSET_BASE_URL ||
  'http://127.0.0.1:54321/storage/v1/object/public/assets'
).replace(/\/+$/, '');

function publicAssetUrl(objectPath) {
  return `${PUBLIC_ASSET_BASE_URL}/${objectPath.replace(/^\/+/, '')}`;
}

const ASSETS = {
  IMG_2681: 'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/IMG_2681.jpeg',
  IMG_4784: 'https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/IMG_4784.jpeg',
  CLASS_ESTACION_CARTAMA_DANZARTI: publicAssetUrl('classes/estacion-cartama-danzarti.png'),
  CLASS_COIN_FUSION_STUDIO: publicAssetUrl('classes/coin-fusion-studio.png'),
};

function toSeedObjectPathSegment(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'lesson';
}

const BACHAZOUK_LESSONS = [
  {
    title: 'Bienvenida al programa Bachazouk Vol. 1',
    description: 'Presentaci\u00f3n del curso, objetivos y forma recomendada de practicar.',
    is_free_preview: true,
    video_storage_path: 'bachazouk-vol-1/01-bienvenida-al-programa-bachazouk-vol-1.mp4',
  },
  {
    title: 'Postura',
    description: 'Trabajo inicial de colocaci\u00f3n corporal para bailar con estabilidad y control.',
    video_storage_path: 'bachazouk-vol-1/02-postura.mov',
  },
  {
    title: 'Tipos de frame',
    description: 'Estructuras de conexi\u00f3n para preparar movimientos de bachazouk con seguridad y claridad.',
    video_storage_path: 'bachazouk-vol-1/03-tipos-de-frame.mp4',
  },
  {
    title: 'Bal\u00e3o',
    description: 'Base t\u00e9cnica del bal\u00e3o y adaptaci\u00f3n al vocabulario de bachazouk.',
    video_storage_path: 'bachazouk-vol-1/04-balao.mp4',
  },
  {
    title: 'Tipos de bal\u00e3o',
    description: 'Variantes principales de bal\u00e3o y criterios para elegir cada ejecuci\u00f3n.',
    video_storage_path: 'bachazouk-vol-1/05-tipos-de-balao.mp4',
  },
  {
    title: 'Pulso de energ\u00eda',
    description: 'Uso del pulso para preparar cambios de din\u00e1mica y mantener musicalidad.',
    video_storage_path: 'bachazouk-vol-1/06-pulso-de-energia.mov',
  },
  {
    title: 'Romper el frame',
    description: 'Trabajo de transiciones y cambios de estructura sin perder control ni conexi\u00f3n.',
    video_storage_path: 'bachazouk-vol-1/07-romper-el-frame.mov',
  },
  {
    title: 'Movimientos activos y pasivos',
    description: 'Introducci\u00f3n al reparto de energ\u00eda entre acciones activas y recepci\u00f3n del movimiento.',
    video_storage_path: 'bachazouk-vol-1/08-movimientos-activos-y-pasivos.mp4',
  },
  {
    title: 'Movimientos pasivos',
    description: 'Recepci\u00f3n del movimiento, control del eje y continuidad sin tensi\u00f3n innecesaria.',
    video_storage_path: 'bachazouk-vol-1/09-movimientos-pasivos.mp4',
  },
  {
    title: 'Base fuerte',
    description: 'Fundamentos de apoyo, direcci\u00f3n y preparaci\u00f3n para giros inclinados.',
    video_storage_path: 'bachazouk-vol-1/10-base-fuerte.mp4',
  },
  {
    title: 'Teor\u00eda del libro leading',
    description: 'Principios de liderazgo aplicados a secuencias complejas de bachazouk.',
    video_storage_path: 'bachazouk-vol-1/11-teoria-del-libro-leading.mov',
  },
  {
    title: 'Respiraci\u00f3n como inicio del movimiento',
    description: 'Uso de la respiraci\u00f3n como se\u00f1al de preparaci\u00f3n y arranque del movimiento.',
    video_storage_path: 'bachazouk-vol-1/12-respiracion-como-inicio-del-movimiento.mov',
  },
  {
    title: 'Tilted turns I',
    description: 'Introducci\u00f3n progresiva a los giros inclinados principales del curso.',
    video_storage_path: 'bachazouk-vol-1/13-tilted-turns.mp4',
  },
  {
    title: 'Tipos de footwork en los giros',
    description: 'Opciones de pies para mejorar estabilidad, limpieza y continuidad en los giros.',
    video_storage_path: 'bachazouk-vol-1/14-tipos-de-footwork-en-los-giros.mp4',
  },
  {
    title: 'Following de tilted turns',
    description: 'Trabajo de respuesta, escucha corporal y continuidad desde el rol de follower.',
    video_storage_path: 'bachazouk-vol-1/15-following-de-tilted-turns.mov',
  },
  {
    title: 'Chicote',
    description: 'T\u00e9cnica de chicote aplicada al control de energ\u00eda y direcci\u00f3n del movimiento.',
    video_storage_path: 'bachazouk-vol-1/16-chicote.mov',
  },
  {
    title: 'Tipos de recuperaciones en tilted turns',
    description: 'Salidas, reajustes de eje y recuperaciones tras movimientos inclinados.',
    video_storage_path: 'bachazouk-vol-1/17-tipos-de-recuperaciones-en-tilted-turns.mov',
  },
  {
    title: 'Frango asado',
    description: 'Figura y mec\u00e1nica de frango asado dentro del vocabulario del curso.',
    video_storage_path: 'bachazouk-vol-1/18-frango-asado.mov',
  },
  {
    title: 'Sensaci\u00f3n de toalha',
    description: 'Ejercicio de textura y continuidad para suavizar transiciones en pareja.',
    video_storage_path: 'bachazouk-vol-1/19-sensacion-de-toalha.mp4',
  },
  {
    title: 'Bate cabello',
    description: 'Trabajo de control, preparaci\u00f3n y recuperaci\u00f3n en movimientos de cabello.',
    video_storage_path: 'bachazouk-vol-1/20-bate-cabello.mov',
  },
  {
    title: 'Proceso de leading',
    description: 'Desglose del proceso de liderazgo para integrar figuras con claridad y seguridad.',
    video_storage_path: 'bachazouk-vol-1/21-proceso-de-leading.mov',
  },
  {
    title: 'Cierre del programa',
    description: 'Resumen final del curso y recomendaciones para seguir practicando el contenido.',
    video_storage_path: 'bachazouk-vol-1/22-cierre-del-programa.mov',
  },
].map((lesson, index) => ({
  fallbackId: '22111111-1111-4111-8111-' + String(111111111101 + index).padStart(12, '0'),
  ...lesson,
  position: index + 1,
  duration_seconds: null,
  is_free_preview: lesson.is_free_preview ?? false,
  video_storage_path:
    lesson.video_storage_path ||
    'demo/bachazouk-vol-1/' +
      String(index + 1).padStart(2, '0') +
      '-' +
      toSeedObjectPathSegment(lesson.title) +
      '.mp4',
}));

const COURSE_SEEDS = [
  {
    fallbackId: '12111111-1111-4111-8111-111111111111',
    title: 'Bachazouk Vol. 1: 8 Tilted Turns',
    slug: 'bachazouk-vol-1-tilted-turns',
    description:
      'Programa progresivo para trabajar bases de bachazouk, tilted turns, leading, following y recuperaciones con control.',
    cover_image_url: ASSETS.IMG_4784,
    level: 'Intermedio',
    price_cents: 3900,
    is_published: true,
    lessons: BACHAZOUK_LESSONS,
    resources: [
      {
        fallbackId: '23111111-1111-4111-8111-111111111111',
        title: 'Gu\u00eda del curso Bachazouk Vol. 1',
        description: 'Documento de apoyo para repasar estructura, conceptos y orden de trabajo del curso.',
        resource_storage_path: 'bachazouk-vol-1/bachazouk-vol-1.pdf',
        file_name: 'Bachazouk Vol. 1.pdf',
        mime_type: 'application/pdf',
        position: 1,
        is_free_preview: false,
        is_published: true,
      },
    ],
  },
];

const EVENT_SEEDS = [
  {
    fallbackId: '31111111-1111-4111-8111-111111111111',
    title: "DJ Got Us Fallin' In Love",
    city: 'Stuttgart',
    event_date: '2026-05-22T10:00:00.000Z',
    end_date: '2026-05-25T12:00:00.000Z',
    type: 'Congreso',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
  {
    fallbackId: '31111111-1111-4111-8111-111111111112',
    title: 'Aldonya Dance Academy',
    city: 'Malmö',
    event_date: '2026-05-29T10:00:00.000Z',
    end_date: '2026-05-30T12:00:00.000Z',
    type: 'Taller',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
  {
    fallbackId: '31111111-1111-4111-8111-111111111113',
    title: 'Sunny Waves Dance Festival',
    city: 'Black Sea Coast, Hotel Laguna',
    event_date: '2026-07-02T10:00:00.000Z',
    end_date: '2026-07-06T12:00:00.000Z',
    type: 'Congreso',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
  {
    fallbackId: '31111111-1111-4111-8111-111111111114',
    title: 'Malmö Bachata Festival',
    city: 'Malmö',
    event_date: '2026-09-25T10:00:00.000Z',
    end_date: '2026-09-27T12:00:00.000Z',
    type: 'Congreso',
    is_active: true,
    ticket_url: 'https://www.instagram.com/suarezycarmenoficial/',
  },
];

const HOME_CONTENT_SEED = {
  hero_eyebrow: 'Academia online de bachata',
  hero_title: 'Master the head movements.',
  hero_subtitle:
    'Domina la sensualidad, el estilo y la conexi\u00f3n con Su\u00e1rez y Carmen. Aprende desde casa paso a paso con cursos individuales y acceso inmediato.',
  hero_video_url: DEMO_VIDEO_SOURCE_URL,
  primary_cta_label: 'Ver cursos',
  primary_cta_href: '/courses',
  is_published: true,
};

const FAQ_SEEDS = [
  {
    fallbackId: '41111111-1111-4111-8111-111111111111',
    question: 'C\u00f3mo se compra un curso',
    answer:
      'Cada curso se compra de forma individual desde su página de detalle. Tras el pago validado, el acceso queda activado en tu cuenta.',
    position: 10,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111112',
    question: 'C\u00f3mo accedo al contenido comprado',
    answer:
      'Inicia sesi\u00f3n con tu cuenta verificada y entra en el detalle del curso. Si el pago est\u00e1 confirmado, las lecciones completas aparecen desbloqueadas.',
    position: 20,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111113',
    question: 'Qu\u00e9 acceso incluye la compra',
    answer:
      'La compra desbloquea las lecciones completas del curso adquirido y permite guardar tu progreso dentro de la cuenta.',
    position: 30,
  },
  {
    fallbackId: '41111111-1111-4111-8111-111111111114',
    question: 'Los eventos presenciales se pagan aqu\u00ed',
    answer: 'No. La plataforma redirige a la ticketera oficial del evento cuando corresponda.',
    position: 40,
  },
];

const IN_PERSON_CLASS_SEEDS = [
  {
    fallbackId: '51111111-1111-4111-8111-111111111111',
    title: 'Clases de bachata en Estaci\u00f3n de C\u00e1rtama',
    city: 'Estaci\u00f3n de C\u00e1rtama',
    venue: 'Academia Danzarti',
    schedule: null,
    description:
      'Clases presenciales de bachata en Academia Danzarti. Contacta para confirmar grupo y disponibilidad.',
    image_url: ASSETS.CLASS_ESTACION_CARTAMA_DANZARTI,
    contact_url: 'https://www.instagram.com/suarezycarmenoficial/',
    position: 10,
    is_active: true,
  },
  {
    fallbackId: '51111111-1111-4111-8111-111111111112',
    title: 'Clases de bachata en Co\u00edn',
    city: 'Co\u00edn',
    venue: 'Fusion Studio',
    schedule: null,
    description:
      'Clases presenciales de bachata en Fusion Studio. Horarios publicados en el cartel oficial.',
    image_url: ASSETS.CLASS_COIN_FUSION_STUDIO,
    contact_url: 'https://www.instagram.com/suarezycarmenoficial/',
    position: 20,
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

function assertSafeFixtureTarget(rawUrl) {
  if (process.env.ALLOW_REMOTE_FIXTURES === '1') return;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL before running local fixtures.');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);
  if (localHosts.has(parsed.hostname)) return;

  throw new Error(
    'Refusing to seed fixture content into a non-local Supabase URL. Set ALLOW_REMOTE_FIXTURES=1 only for an intentional disposable environment.'
  );
}

function assertNoError(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

function isStorageAlreadyExistsError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return error?.statusCode === '409' || message.includes('already exists') || message.includes('resource already exists');
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
          is_published: lessonSeed.is_published ?? true,
        },
        { onConflict: 'id' }
      ),
    `Could not upsert lesson ${lessonSeed.title}`
  );
}

async function upsertCourseResource(courseId, resourceSeed) {
  const existing = await supabase
    .from('course_resources')
    .select('id')
    .eq('course_id', courseId)
    .eq('position', resourceSeed.position)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Could not query course resource ${resourceSeed.title}: ${existing.error.message}`);
  }

  const id = existing.data?.id || resourceSeed.fallbackId;

  assertNoError(
    await supabase
      .from('course_resources')
      .upsert(
        {
          id,
          course_id: courseId,
          title: resourceSeed.title,
          description: resourceSeed.description,
          resource_url: resourceSeed.resource_url ?? null,
          resource_storage_path: resourceSeed.resource_storage_path,
          file_name: resourceSeed.file_name,
          mime_type: resourceSeed.mime_type,
          position: resourceSeed.position,
          is_free_preview: resourceSeed.is_free_preview,
          is_published: resourceSeed.is_published,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ),
    `Could not upsert course resource ${resourceSeed.title}`
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
          end_date: eventSeed.end_date,
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
          secondary_cta_label: null,
          secondary_cta_href: null,
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

async function deactivateLegacyInPersonClassSeeds() {
  const seedTitles = new Set(IN_PERSON_CLASS_SEEDS.map((classSeed) => classSeed.title));
  const legacyTitles = ['Clases regulares en M\u00e1laga', 'Clase de comprobaci\u00f3n editorial'];

  for (const title of legacyTitles) {
    if (seedTitles.has(title)) continue;

    const result = await supabase
      .from('in_person_classes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('title', title);

    assertNoError(result, `Could not deactivate legacy in-person class ${title}`);
  }

  const localSyncCheck = await supabase
    .from('in_person_classes')
    .delete()
    .eq('cms_document_id', 'local-editorial-class-check');

  assertNoError(localSyncCheck, 'Could not remove local CMS sync class check');
}

async function deactivateLegacyFaqSeeds() {
  const localSyncCheck = await supabase
    .from('faqs')
    .delete()
    .eq('cms_document_id', 'local-editorial-faq-check');

  assertNoError(localSyncCheck, 'Could not remove local CMS sync FAQ check');
}

async function deactivateLegacyCourseSeeds() {
  const seedSlugs = new Set(COURSE_SEEDS.map((courseSeed) => courseSeed.slug));
  const legacySlugs = ['bachata-sensual-basico', 'figuras-avanzadas', 'course'];

  for (const slug of legacySlugs) {
    if (seedSlugs.has(slug)) continue;

    const result = await supabase
      .from('courses')
      .update({ is_published: false })
      .eq('slug', slug);

    assertNoError(result, `Could not deactivate legacy course ${slug}`);
  }
}

async function deleteLegacyCourseResourceSeeds() {
  const result = await supabase
    .from('course_resources')
    .delete()
    .eq('resource_storage_path', 'demo/bachazouk-vol-1/bachazouk-vol-1.pdf');

  assertNoError(result, 'Could not delete legacy demo course resource');
}

async function deactivateLegacyEventSeeds() {
  const seedTitles = new Set(EVENT_SEEDS.map((eventSeed) => eventSeed.title));
  const legacyTitles = [
    'Madrid Bachata Festival',
    'Taller Intensivo: Ondas y Body Rolls',
    'Bootcamp Bachata Sensual',
  ];

  for (const title of legacyTitles) {
    if (seedTitles.has(title)) continue;

    const result = await supabase
      .from('events')
      .update({ is_active: false })
      .eq('title', title);

    assertNoError(result, `Could not deactivate legacy event ${title}`);
  }
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

async function ensureResourceBucket() {
  const bucket = await supabase.storage.getBucket(RESOURCE_BUCKET);
  if (!bucket.error) return;

  const created = await supabase.storage.createBucket(RESOURCE_BUCKET, {
    public: false,
  });

  if (created.error && created.error.message !== 'Bucket already exists') {
    throw new Error(`Could not create storage bucket ${RESOURCE_BUCKET}: ${created.error.message}`);
  }
}

function createDemoPdfBuffer() {
  const stream = 'BT /F1 18 Tf 72 720 Td (Bachazouk Vol. 1 - material de apoyo) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
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
        upsert: false,
      });

    if (result.error && isStorageAlreadyExistsError(result.error)) continue;

    assertNoError(result, `Could not upload demo video ${objectPath}`);
  }
}

async function uploadDemoCourseResources() {
  if (process.env.SKIP_DEMO_RESOURCE_UPLOAD === '1') {
    console.log('[seed] Skipping demo resource upload because SKIP_DEMO_RESOURCE_UPLOAD=1.');
    return;
  }

  await ensureResourceBucket();
  const pdfBuffer = createDemoPdfBuffer();
  const paths = COURSE_SEEDS.flatMap((course) =>
    (course.resources || [])
      .filter((resource) => resource.resource_storage_path)
      .map((resource) => resource.resource_storage_path)
  );

  for (const objectPath of paths) {
    const result = await supabase.storage
      .from(RESOURCE_BUCKET)
      .upload(objectPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (result.error && isStorageAlreadyExistsError(result.error)) continue;

    assertNoError(result, `Could not upload demo course resource ${objectPath}`);
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

assertSafeFixtureTarget(supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('[seed] Seeding local fixture courses, lessons, public content, events and private videos...');

for (const courseSeed of COURSE_SEEDS) {
  const courseId = await upsertCourse(courseSeed);
  for (const lessonSeed of courseSeed.lessons) {
    await upsertLesson(courseId, lessonSeed);
  }
  for (const resourceSeed of courseSeed.resources || []) {
    await upsertCourseResource(courseId, resourceSeed);
  }
}
await deactivateLegacyCourseSeeds();
await deleteLegacyCourseResourceSeeds();

for (const eventSeed of EVENT_SEEDS) {
  await upsertEvent(eventSeed);
}
await deactivateLegacyEventSeeds();

await upsertHomeContent();

for (const faqSeed of FAQ_SEEDS) {
  await upsertFaq(faqSeed);
}
await deactivateLegacyFaqSeeds();

for (const classSeed of IN_PERSON_CLASS_SEEDS) {
  await upsertInPersonClass(classSeed);
}
await deactivateLegacyInPersonClassSeeds();

await uploadDemoVideos();
await uploadDemoCourseResources();

console.log('[seed] Local content seed completed.');
