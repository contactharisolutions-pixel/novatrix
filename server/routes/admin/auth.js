const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const prisma = require('../../lib/prisma')
// ─── POST /api/admin/auth/login ────────────────────────────────
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin || !admin.is_active) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/auth/me ───────────────────────────────────
const authenticateAdmin = require('../../middleware/authenticateAdmin')
router.get('/me', authenticateAdmin, async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where:  { id: req.admin.adminId },
      select: { id: true, name: true, email: true, role: true, is_active: true },
    })
    if (!admin) return res.status(404).json({ error: 'Admin not found' })
    res.json({ admin })
  } catch (err) { next(err) }
})

module.exports = router
