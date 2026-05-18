const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const CHECKOUT_SESSION_REGEX = /^cs_[A-Za-z0-9_]+$/;

function requireStripe() {
  if (!stripe) {
    const error = new Error('Stripe is not configured in backend. STRIPE_SECRET_KEY is missing.');
    error.status = 503;
    throw error;
  }

  return stripe;
}

async function getReusableCheckoutSession(stripeClient, checkoutSessionId) {
  if (!checkoutSessionId) return null;

  try {
    const existingSession = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    if (
      existingSession &&
      existingSession.status === 'open' &&
      existingSession.payment_status !== 'paid' &&
      existingSession.url
    ) {
      return existingSession;
    }
  } catch (error) {
    console.warn('[Stripe Controller] Could not retrieve prior checkout session:', error.message);
  }

  return null;
}

function extractPaymentIntentId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return null;
}

function sanitizeCheckoutSessionId(rawValue) {
  if (typeof rawValue !== 'string') return null;
  const value = rawValue.trim();
  if (!CHECKOUT_SESSION_REGEX.test(value)) return null;
  return value;
}

function sanitizeReturnPath(rawValue) {
  if (typeof rawValue !== 'string') return '/courses';

  const value = rawValue.trim();
  if (!value || value.length > 500) return '/courses';
  if (!value.startsWith('/') || value.startsWith('//')) return '/courses';
  if (/[\r\n\t]/.test(value)) return '/courses';
  if (value !== '/courses' && !value.startsWith('/courses/')) return '/courses';

  return value;
}

function buildFrontendReturnUrl(frontendUrl, returnPath, params) {
  const baseUrl = frontendUrl.replace(/\/+$/, '');
  const separator = returnPath.includes('?') ? '&' : '?';
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
    .join('&');

  return `${baseUrl}${returnPath}${separator}${query}`;
}

module.exports = {
  buildFrontendReturnUrl,
  extractPaymentIntentId,
  getReusableCheckoutSession,
  requireStripe,
  sanitizeCheckoutSessionId,
  sanitizeReturnPath,
};
