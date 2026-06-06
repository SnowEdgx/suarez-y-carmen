const { logger } = require('../utils/logger');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const CHECKOUT_SESSION_REGEX = /^cs_[A-Za-z0-9_]+$/;
const DEFAULT_CHECKOUT_RETURN_PATH = '/courses';
const LOCAL_FRONTEND_URL = 'http://localhost:3000';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function createConfigurationError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function requireStripe() {
  if (!stripe) {
    throw createConfigurationError('Stripe is not configured in backend. STRIPE_SECRET_KEY is missing.');
  }

  return stripe;
}

function normalizeHttpUrl(rawValue, name) {
  const value = rawValue?.trim();

  if (!value) {
    if (isProduction()) {
      throw createConfigurationError(`${name} is required in production.`);
    }

    return LOCAL_FRONTEND_URL;
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported URL protocol.');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('URL must not contain credentials, query or hash.');
    }

    return value.replace(/\/+$/, '');
  } catch {
    throw createConfigurationError(`${name} must be a valid HTTP URL.`);
  }
}

function getFrontendUrl() {
  return normalizeHttpUrl(process.env.FRONTEND_URL, 'FRONTEND_URL');
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
    logger.warn('[Stripe Controller] Could not retrieve prior checkout session:', error.message);
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
  if (typeof rawValue !== 'string') return DEFAULT_CHECKOUT_RETURN_PATH;

  const value = rawValue.trim();
  if (!value || value.length > 500) return DEFAULT_CHECKOUT_RETURN_PATH;
  if (!value.startsWith('/') || value.startsWith('//')) return DEFAULT_CHECKOUT_RETURN_PATH;
  if (/[\r\n\t\\]/.test(value)) return DEFAULT_CHECKOUT_RETURN_PATH;
  if (
    value !== DEFAULT_CHECKOUT_RETURN_PATH &&
    !value.startsWith(`${DEFAULT_CHECKOUT_RETURN_PATH}/`) &&
    !value.startsWith(`${DEFAULT_CHECKOUT_RETURN_PATH}?`) &&
    !value.startsWith(`${DEFAULT_CHECKOUT_RETURN_PATH}#`)
  ) {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }

  const pathname = value.split(/[?#]/, 1)[0] || '';
  if (/%2f|%5c/i.test(pathname)) return DEFAULT_CHECKOUT_RETURN_PATH;

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }

  if (/[\r\n\t\\]/.test(decodedPathname)) return DEFAULT_CHECKOUT_RETURN_PATH;
  if (decodedPathname.split('/').some((segment) => segment === '.' || segment === '..')) {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }

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
  getFrontendUrl,
  requireStripe,
  sanitizeCheckoutSessionId,
  sanitizeReturnPath,
};
