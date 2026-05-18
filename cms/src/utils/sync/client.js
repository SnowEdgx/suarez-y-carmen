'use strict';

const { getBackendUrl, getSyncTimeoutMs } = require('./config');

async function sendCmsSync(model, action, entry) {
  const token = process.env.CMS_SYNC_TOKEN;
  if (!token) {
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
    const body = (await response.text()).slice(0, 500);
    throw new Error(`CMS sync failed with ${response.status}: ${body}`);
  }
}

module.exports = {
  sendCmsSync,
};
