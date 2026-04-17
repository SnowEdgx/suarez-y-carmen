const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');

const CHECKOUT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CHECKOUT_RATE_LIMIT_MAX_REQUESTS = 20;
const checkoutRequestBuckets = new Map();

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkoutRateLimit(req, res, next) {
  const ip = getRequestIp(req);
  const now = Date.now();

  const bucket = checkoutRequestBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= CHECKOUT_RATE_LIMIT_WINDOW_MS) {
    checkoutRequestBuckets.set(ip, { windowStart: now, count: 1 });
    return next();
  }

  if (bucket.count >= CHECKOUT_RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.' });
  }

  bucket.count += 1;
  checkoutRequestBuckets.set(ip, bucket);
  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of checkoutRequestBuckets.entries()) {
    if (now - bucket.windowStart >= CHECKOUT_RATE_LIMIT_WINDOW_MS * 2) {
      checkoutRequestBuckets.delete(ip);
    }
  }
}, CHECKOUT_RATE_LIMIT_WINDOW_MS).unref();

// Create checkout session for frontend redirect.
router.post(
  '/create-checkout-session',
  checkoutRateLimit,
  express.json({ limit: '100kb' }),
  stripeController.createCheckoutSession
);

router.get(
  '/checkout-session-status',
  checkoutRateLimit,
  stripeController.getCheckoutSessionStatus
);

// Stripe webhook must receive the raw body for signature verification.
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);

module.exports = router;
