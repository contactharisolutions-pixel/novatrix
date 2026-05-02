/**
 * Input sanitization middleware
 * Strips dangerous characters from req.body strings to prevent XSS/injection.
 * Applied globally before route handlers.
 */

const DANGEROUS_PATTERN = /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:|on\w+\s*=|<\s*\/?\s*(iframe|object|embed|applet|meta|link)/gi

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(DANGEROUS_PATTERN, '').trim()
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value)
  }
  return value
}

function sanitizeObject(obj) {
  const result = {}
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val)
  }
  return result
}

/** Express middleware: recursively sanitize all string values in req.body */
module.exports = function sanitizeInputs(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
}
