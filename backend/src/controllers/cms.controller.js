const { timingSafeEqual } = require('crypto');
const {
  VALID_ACTIONS,
  VALID_MODELS,
  createHttpError,
  dispatchCmsSync,
} = require('../services/cms-sync.service');

function getSyncToken() {
  return process.env.CMS_SYNC_TOKEN || process.env.STRAPI_SYNC_TOKEN || '';
}

function safeTokenEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function requireCmsAuthorization(req) {
  const expectedToken = getSyncToken();
  if (!expectedToken) {
    throw createHttpError(503, 'CMS sync token is not configured.');
  }

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const providedToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!providedToken || !safeTokenEquals(providedToken, expectedToken)) {
    throw createHttpError(401, 'Unauthorized CMS sync request.');
  }
}

function validateSyncPayload(body) {
  const { model, action, entry } = body || {};
  if (!VALID_MODELS.has(model)) {
    throw createHttpError(422, 'Unsupported CMS model.');
  }
  if (!VALID_ACTIONS.has(action)) {
    throw createHttpError(422, 'Unsupported CMS action.');
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw createHttpError(422, 'CMS entry payload is required.');
  }

  return { model, action, entry };
}

exports.syncContent = async (req, res) => {
  try {
    requireCmsAuthorization(req);
    const { model, action, entry } = validateSyncPayload(req.body);
    const data = await dispatchCmsSync({ model, action, entry });

    return res.json({
      synced: true,
      model,
      action,
      id: data?.id || null,
      skipped: Boolean(data?.skipped),
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('[CMS Sync] Processing error:', err.message);
    } else {
      console.warn('[CMS Sync] Rejected request:', err.message);
    }

    const message = status >= 500 ? 'CMS sync failed.' : err.message;
    return res.status(status).json({ error: message });
  }
};
