const { getClientIp } = require('./request');

// keyGenerator lets a route limit by something more specific than the client IP
// (for example the caller's session), which matters when requests arrive through
// the Next.js server and therefore share its IP.
function createIpRateLimit({ windowMs, maxRequests, message, code, keyGenerator }) {
  const buckets = new Map();

  function rateLimit(req, res, next) {
    const customKey = typeof keyGenerator === 'function' ? keyGenerator(req) : null;
    const key = typeof customKey === 'string' && customKey ? customKey : getClientIp(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return next();
    }

    if (bucket.count >= maxRequests) {
      const payload = { error: message };
      if (typeof code === 'string' && code) {
        payload.code = code;
      }
      return res.status(429).json(payload);
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  }

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.windowStart >= windowMs * 2) {
        buckets.delete(key);
      }
    }
  }, windowMs).unref();

  return rateLimit;
}

module.exports = {
  createIpRateLimit,
};
