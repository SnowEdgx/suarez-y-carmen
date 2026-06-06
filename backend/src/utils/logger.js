const REDACTED = '[redacted]';
const MAX_OBJECT_DEPTH = 3;
const MAX_STRING_LENGTH = 800;

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token|api[_-]?key|signature|jwt)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(sk|pk)_(test|live)_[A-Za-z0-9_]+/g,
  /\bwhsec_[A-Za-z0-9_]+/g,
  /\bre_[A-Za-z0-9_]+/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

function sanitizeString(value) {
  let sanitized = value;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    sanitized = sanitized.replace(pattern, REDACTED);
  }

  return sanitized.length > MAX_STRING_LENGTH
    ? `${sanitized.slice(0, MAX_STRING_LENGTH)}...`
    : sanitized;
}

function sanitizeLogValue(value, depth = 0) {
  if (typeof value === 'string') return sanitizeString(value);
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      code: value.code,
      status: value.status,
    };
  }

  if (depth >= MAX_OBJECT_DEPTH) return '[object]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeLogValue(entry, depth + 1));
  }

  const output = {};
  for (const [key, entryValue] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : sanitizeLogValue(entryValue, depth + 1);
  }

  return output;
}

function write(level, args) {
  const method = typeof console[level] === 'function' ? level : 'log';
  console[method](...args.map((arg) => sanitizeLogValue(arg)));
}

const logger = {
  info(...args) {
    write('info', args);
  },
  warn(...args) {
    write('warn', args);
  },
  error(...args) {
    write('error', args);
  },
};

module.exports = {
  logger,
  sanitizeLogValue,
};
