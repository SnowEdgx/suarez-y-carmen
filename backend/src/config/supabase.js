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
  throw new Error('Missing required Supabase env vars (SUPABASE_URL and service role key).');
}

const supabase = createClient(resolvedSupabaseUrl, supabaseServiceKey);

module.exports = {
  resolveSupabaseUrl,
  resolvedSupabaseUrl,
  supabase,
  supabaseServiceKey,
};
