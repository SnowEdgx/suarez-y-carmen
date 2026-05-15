function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  return token || null;
}

function getClientIp(req) {
  // Express applies app-level trust proxy rules before exposing req.ip.
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
