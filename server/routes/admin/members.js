const router            = require('express').Router()
const jwt               = require('jsonwebtoken')
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const { PrismaClient }  = require('@prisma/client')

const prisma = new PrismaClient()
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

module.exports = router
