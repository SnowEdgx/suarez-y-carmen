const { isHttpUrl } = require('./video-storage/path-validation');
const {
  assertHlsRootDirectory,
  getHlsContentType,
  isHlsManifestPath,
  resolveHlsStorageReference,
  resolveStorageReference,
} = require('./video-storage/references');
const { fetchStorageObject } = require('./video-storage/storage-client');
const { rewriteHlsManifest } = require('./video-storage/hls-manifest');

module.exports = {
  assertHlsRootDirectory,
  fetchStorageObject,
  getHlsContentType,
  isHlsManifestPath,
  isHttpUrl,
  resolveHlsStorageReference,
  resolveStorageReference,
  rewriteHlsManifest,
};
