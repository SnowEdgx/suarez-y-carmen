function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  return token || null;
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getUserAgent(req) {
  return typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent']
    : '';
}

module.exports = {
  getBearerToken,
  getClientIp,
  getUserAgent,
};
