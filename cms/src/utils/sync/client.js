'use strict';

const { getBackendUrl, getSyncTimeoutMs } = require('./config');

class CmsSyncError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CmsSyncError';
    this.status = options.status;
    this.body = options.body;
    this.code = options.code;
  }
}

async function readErrorBody(response) {
  const body = (await response.text()).slice(0, 500);

  try {
    const parsed = JSON.parse(body);
    return {
      body,
      message: typeof parsed.error === 'string' ? parsed.error : body,
      code: typeof parsed.code === 'string' ? parsed.code : null,
    };
  } catch {
    return { body, message: body, code: null };
  }
}

async function sendCmsSync(model, action, entry) {
  const token = process.env.CMS_SYNC_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      throw new CmsSyncError('CMS_SYNC_TOKEN is required in production.', {
        status: 503,
        code: 'cms_sync_configuration_error',
      });
    }

    strapi.log.warn('[CMS Sync] CMS_SYNC_TOKEN is missing. Entry was not synced.');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getSyncTimeoutMs());

  const response = await fetch(`${getBackendUrl()}/api/cms/sync`, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, action, entry }),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new CmsSyncError(`CMS sync failed with ${response.status}: ${errorBody.message}`, {
      status: response.status,
      body: errorBody.body,
      code: errorBody.code,
    });
  }
}

module.exports = {
  CmsSyncError,
  sendCmsSync,
};
