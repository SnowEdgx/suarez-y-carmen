'use strict';

function getBackendUrl() {
  return (process.env.CMS_SYNC_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
}

function getPublicUrl() {
  return (process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || 'http://localhost:1337').replace(/\/+$/, '');
}

function resolveMediaUrl(media) {
  const item = Array.isArray(media) ? media[0] : media;
  if (!item || typeof item.url !== 'string') return null;

  if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
    return item.url;
  }

  return `${getPublicUrl()}${item.url.startsWith('/') ? '' : '/'}${item.url}`;
}

async function sendCmsSync(model, action, entry) {
  const token = process.env.CMS_SYNC_TOKEN;
  if (!token) {
    strapi.log.warn('[CMS Sync] CMS_SYNC_TOKEN is missing. Entry was not synced.');
    return;
  }

  const response = await fetch(`${getBackendUrl()}/api/cms/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, action, entry }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CMS sync failed with ${response.status}: ${body}`);
  }
}

async function findDocument(uid, documentId, populate) {
  if (!documentId) return null;
  return strapi.documents(uid).findOne({ documentId, populate });
}

module.exports = {
  findDocument,
  resolveMediaUrl,
  sendCmsSync,
};
