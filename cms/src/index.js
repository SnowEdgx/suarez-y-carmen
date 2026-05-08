'use strict';

const { syncDocumentAction } = require('./utils/sync-to-backend');

module.exports = {
  register({ strapi }) {
    strapi.documents.use(async (context, next) => {
      const result = await next();
      await syncDocumentAction(context, result);
      return result;
    });
  },
  bootstrap() {},
};
