const { createHttpError } = require('./validation');

function assertFallbackOwnership(row, cmsDocumentId, entityName, lookupDescription) {
  if (!row) return null;

  if (cmsDocumentId && row.cms_document_id && row.cms_document_id !== cmsDocumentId) {
    throw createHttpError(
      409,
      `${entityName} fallback match by ${lookupDescription} is already linked to another CMS document.`
    );
  }

  return row;
}

module.exports = {
  assertFallbackOwnership,
};
