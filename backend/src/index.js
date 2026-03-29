require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Supabase Client ──────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// ── Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors());

// ── Rutas de Integración (Ej: Stripe Webhooks deben usar .raw en su propio archivo)
// Para que Stripe puede verificar firmas correctamente, DEBE saltarse express.json()
app.use('/api/stripe', require('./routes/stripe.routes'));

app.use(express.json());

// ── Health-check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Supabase connection test ─────────────────────────
app.get('/api/supabase-test', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('courses').select('id').limit(1);
    if (error) throw error;
    res.json({ supabase: 'connected', courses_query: data });
  } catch (err) {
    res.status(500).json({ supabase: 'error', message: err.message });
  }
});

// ── Start ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
});
