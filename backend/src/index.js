require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;
app.set('trust proxy', 1);

function resolveSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) return rawUrl;

  // In local host execution, host.docker.internal may fail on some Windows setups.
  // Keep container behavior intact when RUNNING_IN_DOCKER=true.
  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }

  return rawUrl;
}

const resolvedSupabaseUrl = resolveSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const requiredEnvVars = {
  SUPABASE_URL: resolvedSupabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Supabase client.
const supabase = createClient(
  resolvedSupabaseUrl,
  supabaseServiceKey
);

// Core middleware.
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (Stripe webhook, server-to-server).
      if (!origin) return callback(null, true);

      // Safe defaults for local development.
      if (
        origin === 'http://localhost:3000' ||
        origin === 'http://127.0.0.1:3000' ||
        corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

// Register integration routes before express.json().
// Stripe webhooks need the raw body for signature verification.
app.use('/api/stripe', require('./routes/stripe.routes'));

app.use(express.json({ limit: '100kb' }));

// Health check.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Supabase connection test (development only).
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/supabase-test', async (_req, res) => {
    try {
      const { data, error } = await supabase.from('courses').select('id').limit(1);
      if (error) throw error;
      res.json({ supabase: 'connected', courses_query: data });
    } catch (err) {
      res.status(500).json({ supabase: 'error', message: err.message });
    }
  });
}

app.use((err, _req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err))) {
    return res.status(400).json({ error: 'JSON malformado en la solicitud.' });
  }

  if (err && err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin denied.' });
  }
  return next(err);
});

// Start server.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
