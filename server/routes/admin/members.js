const router            = require('express').Router()
const jwt               = require('jsonwebtoken')
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
const { triggerDirectAndLevelBonus } = require('../../services/bonusEngine')
const { processRewards }              = require('../../services/rewardEngine')
const { updateRoyaltyRanks }          = require('../../services/royaltyEngine')

router.use(authenticateAdmin)

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const signRefresh = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

// ─── GET /api/admin/members ──────────────────────────────────
// Query: ?page, ?status, ?search (user_id or name or email), ?from, ?to
router.get('/', async (req, res, next) => {
  const page     = parseInt(req.query.page   || '1')
  const pageSize = parseInt(req.query.limit  || '20')
  const status   = req.query.status  || undefined
  const search   = req.query.search  || ''
  const from     = req.query.from ? new Date(req.query.from) : undefined
  const to       = req.query.to   ? new Date(req.query.to)   : undefined

  try {
    const where = {
      ...(status && { status }),
      ...( (from || to) && { created_at: { ...(from && { gte: from }), ...(to && { lte: to }) } } ),
      ...(search && {
        OR: [
          { user_id: { contains: search, mode: 'insensitive' } },
          { name:    { contains: search, mode: 'insensitive' } },
          { email:   { contains: search, mode: 'insensitive' } },
        ],
      }),
    }
    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { created_at: 'desc' },
        select: {
          id: true, user_id: true, name: true, email: true, phone: true,
          status: true, fund_wallet_balance: true, income_wallet_balance: true,
          referral_code: true, created_at: true,
          sponsor: { select: { user_id: true, name: true } },
          _count:  { select: { referrals: true, packages: true } },
        },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ members, total, page, pages: Math.ceil(total / pageSize) })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/members/:id/impersonate ──────────────────
router.get('/:id/impersonate', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const token   = signToken({ id: user.id, user_id: user.user_id })
    const refresh = signRefresh({ id: user.id })

    res.json({
      message: 'Impersonation successful',
      token,
      refresh,
      user: {
        id:      user.id,
        user_id: user.user_id,
        name:    user.name,
        email:   user.email,
        status:  user.status,
      },
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/members/:id ──────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const member = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        packages:   { orderBy: { started_at: 'desc' }, take: 20 },
        deposits:   { orderBy: { created_at: 'desc' }, take: 10 },
        withdrawals:{ orderBy: { created_at: 'desc' }, take: 10 },
        bonuses:    { orderBy: { created_at: 'desc' }, take: 20 },
        kyc_document: true,
        sponsor: { select: { user_id: true, name: true } },
      },
    })
    if (!member) return res.status(404).json({ error: 'Member not found' })
    res.json({ member })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/members/:id/status ───────────────────────
router.put('/:id/status', async (req, res, next) => {
  const { status } = req.body
  const VALID = ['active', 'inactive', 'blocked']
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  try {
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { status } })
    res.json({ message: `Member ${status}` })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/members/:id/add-balance ─────────────────
router.post('/:id/add-balance', async (req, res, next) => {
  const { wallet, amount, remarks } = req.body
  if (!['fund', 'income'].includes(wallet)) return res.status(400).json({ error: 'wallet must be fund or income' })
  if (!amount || amount <= 0)              return res.status(400).json({ error: 'Amount must be positive' })

  try {
    const field = wallet === 'fund' ? 'fund_wallet_balance' : 'income_wallet_balance'
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: parseInt(req.params.id) },
        data:  { [field]: { increment: parseFloat(amount) } },
      })
      if (wallet === 'income') {
        await tx.incomeLedger.create({
          data: {
            user_id:       parseInt(req.params.id),
            type:          'credit',
            amount:        parseFloat(amount),
            balance_after: updated.income_wallet_balance,
            remarks:       remarks || `Admin credit by ${req.admin.email}`,
            reference_type: 'admin_credit',
          },
        })
      } else {
        // Fund wallet — write to FundLedger for audit trail
        await tx.fundLedger.create({
          data: {
            user_id:       parseInt(req.params.id),
            type:          'credit',
            amount:        parseFloat(amount),
            balance_after: updated.fund_wallet_balance,
            remarks:       remarks || `Admin fund credit by ${req.admin.email}`,
            reference_type: 'admin_credit',
          },
        })
      }
    })
    res.json({ message: `$${amount} added to ${wallet} wallet` })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/members/:id/activate-package ────────────
router.post('/:id/activate-package', async (req, res, next) => {
  const { amount } = req.body
  const amt = parseFloat(amount)

  if (!amt || amt < 20 || amt > 5000) {
    return res.status(400).json({ error: 'Amount must be between $20 and $5,000' })
  }

  const DAY_15_END = new Date('2026-05-17T00:00:00+05:30') // Same as trades.js logic

  try {
    const target = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!target) return res.status(404).json({ error: 'Target member not found' })

    // FIX #4: daily_roi_percent is determined by activation date relative to platform launch.
    // The roiCron calculates and stores the correct date-based rate on each distribution run.
    const dailyRoi = 0

    // Target member's total investment up to 15 days from launch
    const today = new Date()
    const [targetInvestRes] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id = ${target.id} AND started_at <= ${DAY_15_END}
    `
    let targetInvest15Days = parseFloat(targetInvestRes?.total || 0)
    if (today <= DAY_15_END) targetInvest15Days += amt

    // Downline total business up to 15 days from launch
    const [teamInvestRes15Days] = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE sponsor_id = ${target.id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${DAY_15_END}
    `
    const teamTotal15Days = parseFloat(teamInvestRes15Days?.total || 0)

    let maxMultiplier = 2
    if (targetInvest15Days > 0 && teamTotal15Days >= 3 * targetInvest15Days) {
      maxMultiplier = 3
    }
    const maxReturn = amt * maxMultiplier

    await prisma.$transaction(async (tx) => {
      // 1. Create Trade Package Directly (No Fund Allotment Required)
      await tx.tradePackage.create({
        data: {
          user_id: target.id,
          amount: amt,
          daily_roi_percent: dailyRoi,
          max_return: maxReturn,
          status: 'active',
        }
      })

      // 4. Update status if inactive
      if (target.status === 'inactive' || target.status === 'blocked') {
        await tx.user.update({
          where: { id: target.id },
          data: { status: 'active' }
        })
      }
    })

    // Trigger bonuses for target's sponsor chain
    if (target.sponsor_id) {
      triggerDirectAndLevelBonus(target.id, amt).catch(console.error)
    }
    // Instant rank/royalty re-evaluation
    processRewards().catch(console.error)
    updateRoyaltyRanks().catch(console.error)

    res.status(201).json({ message: `Successfully activated member with $${amt} package` })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/admin/members/:id/reset-password ──────────────
const bcrypt = require('bcryptjs')
router.post('/:id/reset-password', async (req, res, next) => {
  const { new_password } = req.body
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  try {
    const hash = await bcrypt.hash(new_password, 12)
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data:  { password_hash: hash },
    })
    res.json({ message: 'Password reset successfully', new_password })
  } catch (err) { next(err) }
})

module.exports = router
