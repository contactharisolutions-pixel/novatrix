const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const email             = require('../../services/emailService')

const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/deposits ──────────────────────────────────
router.get('/', async (req, res, next) => {
  const page     = parseInt(req.query.page  || '1')
  const pageSize = 20
  const status   = req.query.status || undefined

  try {
    const where = status ? { status } : {}
    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true, email: true } } },
      }),
      prisma.deposit.count({ where }),
    ])
    res.json({ deposits, total, page, pages: Math.ceil(total / pageSize) })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/deposits/:id/approve ─────────────────────
router.put('/:id/approve', async (req, res, next) => {
  try {
    const deposit = await prisma.deposit.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!deposit)                     return res.status(404).json({ error: 'Deposit not found' })
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed' })

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data:  { status: 'approved', admin_id: req.admin.adminId, approved_at: new Date() },
      })
      const updated = await tx.user.update({
        where: { id: deposit.user_id },
        data:  { fund_wallet_balance: { increment: deposit.amount } },
      })
      await tx.fundLedger.create({
        data: {
          user_id:        deposit.user_id,
          type:           'credit',
          amount:         deposit.amount,
          balance_after:  updated.fund_wallet_balance,
          remarks:        `Deposit #${deposit.id} approved`,
          reference_type: 'deposit',
          reference_id:   deposit.id,
        },
      })
    })

    // Non-blocking email notification
    email.depositApproved({
      to:     deposit.user.email,
      name:   deposit.user.name,
      amount: deposit.amount,
    })

    res.json({ message: 'Deposit approved and fund wallet credited' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/deposits/:id/reject ──────────────────────
router.put('/:id/reject', async (req, res, next) => {
  const { note } = req.body
  try {
    const deposit = await prisma.deposit.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!deposit)                     return res.status(404).json({ error: 'Deposit not found' })
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit already processed' })

    await prisma.deposit.update({
      where: { id: deposit.id },
      data:  { status: 'rejected', admin_id: req.admin.adminId, note: note || 'Rejected by admin' },
    })

    res.json({ message: 'Deposit rejected' })
  } catch (err) { next(err) }
})

module.exports = router
