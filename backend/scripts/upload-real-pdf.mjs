import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

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

// Cargar variables locales como fallback
loadEnvFile(path.join(repoRoot, 'backend', '.env.local'));

function resolveSupabaseUrl(rawUrl) {
  if (!rawUrl) return 'http://127.0.0.1:54321';
  if (rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }
  return rawUrl;
}

const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const pdfPath = process.env.PDF_SOURCE_PATH || 'C:\\Users\\pedrx\\Downloads\\0. Bachazouk vol 1.pdf';
const bucketName = process.env.SUPABASE_RESOURCE_BUCKET || 'course-resources';
const storagePath = 'bachazouk-vol-1/bachazouk-vol-1.pdf';

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan credenciales de Supabase. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!existsSync(pdfPath)) {
  console.error(`ERROR: El archivo PDF no existe en: ${pdfPath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log(`Conectando a Supabase URL: ${supabaseUrl}`);
  console.log(`Subiendo PDF desde: ${pdfPath}`);
  console.log(`Destino Bucket: ${bucketName}/${storagePath}`);

  // Asegurar que el bucket existe
  const { data: bucket, error: bucketErr } = await supabase.storage.getBucket(bucketName);
  if (bucketErr) {
    console.log(`Creando bucket "${bucketName}"...`);
    const { error: createErr } = await supabase.storage.createBucket(bucketName, { public: false });
    if (createErr && !createErr.message.includes('already exists')) {
      throw new Error(`No se pudo crear el bucket: ${createErr.message}`);
    }
  }

  const fileBuffer = readFileSync(pdfPath);

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error(`❌ Error al subir el PDF: ${error.message}`);
    process.exit(1);
  } else {
    console.log(`✅ PDF subido con éxito a ${bucketName}/${storagePath}`);
  }
}

main().catch(console.error);
