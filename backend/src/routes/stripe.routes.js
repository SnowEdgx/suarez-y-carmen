const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');
const { createIpRateLimit } = require('../utils/rate-limit');

const CHECKOUT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CHECKOUT_RATE_LIMIT_MAX_REQUESTS = 20;
const parseCheckoutJson = express.json({ limit: '100kb' });
const checkoutRateLimit = createIpRateLimit({
  windowMs: CHECKOUT_RATE_LIMIT_WINDOW_MS,
  maxRequests: CHECKOUT_RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.',
  code: 'rate_limited',
});

function parseCheckoutJsonSafely(req, res, next) {
  parseCheckoutJson(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'JSON malformado en la solicitud.' });
    }
    return next();
  });
}

// Create checkout session for frontend redirect.
router.post(
  '/create-checkout-session',
  checkoutRateLimit,
  parseCheckoutJsonSafely,
  stripeController.createCheckoutSession
);

router.get(
  '/checkout-session-status',
  checkoutRateLimit,
  stripeController.getCheckoutSessionStatus
);

// Stripe webhook must receive the raw body for signature verification.
router.post('/webhook', express.raw({ type: 'application/json', limit: '100kb' }), stripeController.webhook);

module.exports = router;

