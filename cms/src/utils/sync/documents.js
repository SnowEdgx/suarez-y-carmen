'use strict';

const { getErrorMessage } = require('./config');
const { sendCmsSync } = require('./client');
const { SYNC_ACTIONS, SYNC_MODELS } = require('./model-config');

async function findDocument(uid, documentId, populate, status) {
  if (!documentId) return null;

  const query = { documentId, populate };
  if (status) query.status = status;

  return strapi.documents(uid).findOne(query);
}

function pushDocumentId(target, value) {
  if (typeof value === 'string' && value) {
    target.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => pushDocumentId(target, item));
  }
}

function getResultDocuments(result) {
  if (Array.isArray(result)) return result.filter((item) => item?.documentId);
  if (Array.isArray(result?.entries)) return result.entries.filter((item) => item?.documentId);
  if (result?.documentId) return [result];
  return [];
}

function getDocumentIds(context, result) {
  const documentIds = [];

  getResultDocuments(result).forEach((document) => pushDocumentId(documentIds, document.documentId));
  pushDocumentId(documentIds, context?.params?.documentId);
  pushDocumentId(documentIds, context?.params?.documentIds);
  pushDocumentId(documentIds, context?.params?.where?.documentId);

  return [...new Set(documentIds)];
}

async function syncDocumentAction(context, result) {
  const config = SYNC_MODELS[context?.uid];
  const backendAction = SYNC_ACTIONS[context?.action];
  if (!config || !backendAction) return;

  const documentIds = getDocumentIds(context, result);
  if (documentIds.length === 0) {
    strapi.log.warn(`[CMS Sync] Could not resolve documentId for ${context.uid}.${context.action}.`);
    return;
  }

  const resultDocuments = getResultDocuments(result);

  for (const documentId of documentIds) {
    const document = backendAction === 'upsert'
      ? await findDocument(context.uid, documentId, config.populate, 'published')
      : resultDocuments.find((item) => item.documentId === documentId) || { documentId };

    if (backendAction === 'upsert' && !document) {
      if (context.action !== 'update') {
        strapi.log.warn(`[CMS Sync] Published ${context.uid} ${documentId} could not be loaded.`);
      }
      continue;
    }

    try {
      await sendCmsSync(config.model, backendAction, config.buildEntry(document));
    } catch (error) {
      strapi.log.error(`[CMS Sync] ${config.model} ${backendAction} ${documentId} failed: ${getErrorMessage(error)}`);
    }
  }
}

module.exports = {
  findDocument,
  getDocumentIds,
  getResultDocuments,
  pushDocumentId,
  syncDocumentAction,
};
