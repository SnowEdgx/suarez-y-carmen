function sanitizeRangeHeader(value) {
  if (typeof value !== 'string' || value.length === 0) return null;

  const trimmed = value.trim();
  if (trimmed.length > 80) return 'too-long';
  if (!/^bytes=(?:\d+-\d*|\d*-\d+)$/.test(trimmed)) return 'invalid';

  return trimmed;
}

function getForwardableRangeHeader(req) {
  const rawRangeHeader = req.headers.range;
  if (rawRangeHeader === undefined) return undefined;

  const sanitizedRangeHeader = sanitizeRangeHeader(rawRangeHeader);
  if (!sanitizedRangeHeader || sanitizedRangeHeader === 'invalid' || sanitizedRangeHeader === 'too-long') {
    const error = new Error('Invalid video Range header.');
    error.status = 416;
    error.code = 'invalid_range';
    throw error;
  }

  return sanitizedRangeHeader;
}

module.exports = {
  getForwardableRangeHeader,
  sanitizeRangeHeader,
};
