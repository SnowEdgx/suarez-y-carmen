'use strict';

const LOCAL_BACKEND_URL = 'http://localhost:4000';
const LOCAL_PUBLIC_URL = 'http://localhost:1337';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function createConfigurationError(message) {
  return new Error(message);
}

function normalizeHttpUrl(rawValue, name, fallback) {
  const value = rawValue?.trim();

  if (!value) {
    if (isProduction()) {
      throw createConfigurationError(`${name} is required in production.`);
    }

    return fallback;
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

function getBackendUrl() {
  return normalizeHttpUrl(
    process.env.CMS_SYNC_BACKEND_URL,
    'CMS_SYNC_BACKEND_URL',
    LOCAL_BACKEND_URL
  );
}

function getPublicUrl() {
  return normalizeHttpUrl(
    process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL,
    'PUBLIC_URL or STRAPI_PUBLIC_URL',
    LOCAL_PUBLIC_URL
  );
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
