const jwt = require('jsonwebtoken')

/**
 * Middleware: verify JWT and ensure the token belongs to an Admin.
 * Admin tokens carry { adminId, email, role } — set during admin login.
 */
module.exports = function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authorization token required' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (!payload.adminId) {
      return res.status(403).json({ error: 'Admin access required' })
    }
    req.admin = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' })
  }
}
