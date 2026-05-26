const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

/** Middleware: verify JWT and attach user payload to req.user */
module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' })
  }
  const token = authHeader.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)

    // Check if user is blocked in DB
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    })
    if (!user || user.status === 'blocked') {
      return res.status(403).json({ error: 'Account suspended' })
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
