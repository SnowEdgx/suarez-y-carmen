'use strict';

function getBackendUrl() {
  return (process.env.CMS_SYNC_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
}

function getPublicUrl() {
  return (process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || 'http://localhost:1337').replace(/\/+$/, '');
}

function getSyncTimeoutMs() {
  const value = Number(process.env.CMS_SYNC_TIMEOUT_MS || 5000);
  return Number.isInteger(value) && value > 0 ? value : 5000;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unknown CMS sync error';
}

module.exports = {
  getBackendUrl,
  getErrorMessage,
  getPublicUrl,
  getSyncTimeoutMs,
};
