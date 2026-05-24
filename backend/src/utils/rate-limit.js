const { getClientIp } = require('./request');

function createIpRateLimit({ windowMs, maxRequests, message, code }) {
  const buckets = new Map();

  function rateLimit(req, res, next) {
    const key = getClientIp(req);
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
