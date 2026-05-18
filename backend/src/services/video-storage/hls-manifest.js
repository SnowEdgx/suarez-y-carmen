const path = require('path');
const {
  MAX_STORAGE_OBJECT_PATH_LENGTH,
  hasUnsafePathSegments,
  isExternalHlsUri,
} = require('./path-validation');
const {
  getHlsRootDirectory,
  getRelativeHlsPath,
} = require('./references');

const BLOCKED_HLS_URI = 'blocked-external-hls-uri';

function buildHlsResourceUrl(rawToken, resourcePath) {
  return `/api/lessons/hls/${encodeURIComponent(rawToken)}/resource?path=${encodeURIComponent(resourcePath)}`;
}

function resolveManifestUri({ rootReference, currentReference, uri }) {
  const trimmedUri = typeof uri === 'string' ? uri.trim() : '';
  if (!trimmedUri || isExternalHlsUri(trimmedUri)) return null;
  if (trimmedUri.length > MAX_STORAGE_OBJECT_PATH_LENGTH || trimmedUri.includes('\0')) return null;
  if (trimmedUri.startsWith('/') || hasUnsafePathSegments(trimmedUri, { allowParentSegments: true })) {
    return null;
  }

  const rootDirectory = getHlsRootDirectory(rootReference.path);
  const currentDirectory = path.posix.dirname(currentReference.path);
  const safeCurrentDirectory = currentDirectory === '.' ? '' : currentDirectory;
  const objectPath = path.posix.normalize(
    safeCurrentDirectory ? path.posix.join(safeCurrentDirectory, trimmedUri) : trimmedUri
  );

  if (rootDirectory && objectPath !== rootDirectory && !objectPath.startsWith(`${rootDirectory}/`)) {
    return null;
  }

  if (objectPath.startsWith('../') || objectPath.includes('/../')) return null;

  return getRelativeHlsPath(rootReference, objectPath);
}

function rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken }) {
  return line.replace(/URI="([^"]+)"/g, (match, uri) => {
    const relativePath = resolveManifestUri({ rootReference, currentReference, uri });
    if (!relativePath) return `URI="${BLOCKED_HLS_URI}"`;

    return `URI="${buildHlsResourceUrl(rawToken, relativePath)}"`;
  });
}

function rewriteHlsManifest({ manifestText, rootReference, currentReference, rawToken }) {
  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      if (trimmedLine.startsWith('#')) {
        return rewriteHlsUriAttributes({ line, rootReference, currentReference, rawToken });
      }

      const relativePath = resolveManifestUri({
        rootReference,
        currentReference,
        uri: trimmedLine,
      });

      return relativePath ? buildHlsResourceUrl(rawToken, relativePath) : '# blocked external HLS URI';
    })
    .join('\n');
}

module.exports = {
  buildHlsResourceUrl,
  resolveManifestUri,
  rewriteHlsManifest,
};
