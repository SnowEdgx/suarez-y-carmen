'use strict';

const { getPublicUrl } = require('./config');

function resolveMediaUrl(media) {
  const item = Array.isArray(media) ? media[0] : media;
  if (!item || typeof item.url !== 'string') return null;

  if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
    return item.url;
  }

  return `${getPublicUrl()}${item.url.startsWith('/') ? '' : '/'}${item.url}`;
}

module.exports = {
  resolveMediaUrl,
};
