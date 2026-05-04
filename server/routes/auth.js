const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const jwt          = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const prisma = require('../lib/prisma')
/** Generate a unique 6-digit user_id */
async function generateUserId() {
  let id, exists = true
  while (exists) {
    id     = String(Math.floor(100000 + Math.random() * 900000))
    exists = await prisma.user.findUnique({ where: { user_id: id } })
  }
  return id
}

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const signRefresh = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

// ─── POST /api/auth/register ──────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').trim().isLength({ min: 7 }).withMessage('Valid phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, email, phone, password, referral_code } = req.body
    try {
      // Check duplicate email
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return res.status(409).json({ error: 'Email already registered' })

      // Resolve sponsor
      let sponsor = null
      if (referral_code) {
        sponsor = await prisma.user.findUnique({ where: { referral_code } })
        if (!sponsor) return res.status(404).json({ error: 'Invalid referral code' })
      }

      const user_id       = await generateUserId()
      const password_hash = await bcrypt.hash(password, 12)
      const myReferralCode = `${user_id}`

      const user = await prisma.user.create({
        data: {
          user_id,
          name,
          email,
          phone,
          password_hash,
          referral_code: myReferralCode,
          sponsor_id: sponsor?.id ?? null,
        },
      })

      const token   = signToken({ id: user.id, user_id: user.user_id })
      const refresh = signRefresh({ id: user.id })

      res.status(201).json({
        message: 'Account created successfully',
        user_id: user.user_id,
        token,
        refresh,
        user: {
          id:                    user.id,
          user_id:               user.user_id,
          name:                  user.name,
          email:                 user.email,
          status:                user.status,
          referral_code:         user.referral_code,
          fund_wallet_balance:   user.fund_wallet_balance,
          income_wallet_balance: user.income_wallet_balance,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [
    body('user_id').trim().notEmpty().withMessage('User ID required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { user_id, password } = req.body
    try {
      const user = await prisma.user.findUnique({ where: { user_id } })
      if (!user) return res.status(401).json({ error: 'Invalid credentials' })

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

      if (user.status === 'blocked') return res.status(403).json({ error: 'Account suspended' })

      const token   = signToken({ id: user.id, user_id: user.user_id })
      const refresh = signRefresh({ id: user.id })

      res.json({
        message: 'Login successful',
        token,
        refresh,
        user: {
          id:                    user.id,
          user_id:               user.user_id,
          name:                  user.name,
          email:                 user.email,
          status:                user.status,
          referral_code:         user.referral_code,
          fund_wallet_balance:   user.fund_wallet_balance,
          income_wallet_balance: user.income_wallet_balance,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  const { refresh } = req.body
  if (!refresh) return res.status(401).json({ error: 'Refresh token required' })
  try {
    const payload = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET)
    const user    = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return res.status(401).json({ error: 'User not found' })
    const token = signToken({ id: user.id, user_id: user.user_id })
    res.json({ token })
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

module.exports = router
