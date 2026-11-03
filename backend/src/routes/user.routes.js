const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { createIpRateLimit } = require('../utils/rate-limit');
const { getBearerToken } = require('../utils/request');

// These calls arrive from Next.js server actions, so every user shares the frontend
// server IP. Limit deletion requests per session instead; the controller also enforces
// a per-account cooldown in the database so a single account cannot trigger email spam.
function sessionRateLimitKey(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  return `session:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

const requestDeletionRateLimit = createIpRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
  code: 'account_deletion_rate_limited',
  keyGenerator: sessionRateLimitKey,
});

// Confirmation tokens are random UUIDs, so this only guards against abuse bursts.
const confirmDeletionRateLimit = createIpRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.',
  code: 'account_deletion_rate_limited',
});

// Requires an authenticated user with a verified email.
router.post('/request-delete-account', requestDeletionRateLimit, userController.requestDeleteAccount);

// Public: the single-use token from the confirmation email is the credential.
router.post('/confirm-delete-account', confirmDeletionRateLimit, userController.confirmDeleteAccount);

module.exports = router;
