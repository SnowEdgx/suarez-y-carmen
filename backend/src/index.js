require('dotenv').config({ path: '.env.local', quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { supabase } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

function resolveTrustProxy() {
  const rawValue = process.env.TRUST_PROXY?.trim();
  if (!rawValue) return isProduction ? 1 : false;

  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;

  const numericValue = Number(rawValue);
  if (Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= 10) {
    return numericValue;
  }

  return rawValue;
}

app.set('trust proxy', resolveTrustProxy());

const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevelopmentOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

// Core middleware.
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (Stripe webhook, server-to-server).
      if (!origin) return callback(null, true);

      // Safe defaults are development-only. Production must declare CORS_ORIGINS.
      if ((!isProduction && localDevelopmentOrigins.has(origin)) || corsOrigins.includes(origin)) {
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
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/stripe', require('./routes/stripe.routes'));
app.use('/api/cms', require('./routes/cms.routes'));

app.use(express.json({ limit: '100kb' }));
app.use('/api/lessons', require('./routes/lesson.routes'));
app.use('/api/course-resources', require('./routes/course-resource.routes'));
app.use('/api/video-devices', require('./routes/video-device.routes'));

// Health check.
app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// Supabase connection test (explicitly enabled for local diagnostics only).
if (!isProduction && process.env.ENABLE_SUPABASE_TEST_ENDPOINT === 'true') {
  app.get('/api/supabase-test', async (_req, res) => {
    try {
      const { error } = await supabase.from('courses').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) throw error;
      res.json({ supabase: 'connected' });
    } catch (err) {
      console.error('[Supabase Test] Connection check failed:', err.message);
      res.status(500).json({ supabase: 'error', message: 'Supabase connection test failed.' });
    }
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err))) {
    return res.status(400).json({ error: 'JSON malformado en la solicitud.' });
  }

  if (err && err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin denied.' });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status >= 500) {
    console.error('[Express] Unhandled error:', err?.message || 'Unknown error');
  }

  return res.status(status).json({
    error: status >= 500 ? 'Internal server error.' : 'Request failed.',
  });
});

// Start server.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
