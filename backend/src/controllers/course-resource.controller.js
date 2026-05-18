const { getAuthenticatedUser } = require('../utils/auth');
const { UUID_REGEX } = require('../utils/validation');
const {
  getSafeResourceAccessCode,
  resolveCourseResourceAccess,
} = require('../services/course-resource-access.service');

exports.getCourseResourceUrl = async (req, res) => {
  try {
    const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId.trim() : '';
    if (!UUID_REGEX.test(resourceId)) {
      return res.status(400).json({ error: 'El material solicitado no es v\u00e1lido.' });
    }

    const user = await getAuthenticatedUser(req);
    const access = await resolveCourseResourceAccess({ resourceId, user });

    res.set('Cache-Control', 'no-store');
    return res.json(access);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('[Course Resource Controller] Error resolving resource access:', err.message);
    } else {
      console.warn('[Course Resource Controller] Resource access rejected:', err.message);
    }

    return res.status(status).json({
      error: 'No se pudo resolver el acceso al material.',
      code: getSafeResourceAccessCode(err),
    });
  }
};
