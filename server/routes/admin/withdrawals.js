const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const email             = require('../../services/emailService')

const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/withdrawals ───────────────────────────────
router.get('/', async (req, res, next) => {
  const page     = parseInt(req.query.page || '1')
  const pageSize = 20
  const status   = req.query.status || undefined

  try {
    const where = status ? { status } : {}
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true, email: true } } },
      }),
      prisma.withdrawal.count({ where }),
    ])
    res.json({ withdrawals, total, page, pages: Math.ceil(total / pageSize) })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/withdrawals/:id/approve ───────────────────
router.put('/:id/approve', async (req, res, next) => {
  const { tx_hash } = req.body
  if (!tx_hash?.trim()) return res.status(400).json({ error: 'Transaction hash is required' })

  try {
    const wd = await prisma.withdrawal.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!wd)                     return res.status(404).json({ error: 'Withdrawal not found' })
    if (wd.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed' })

    await prisma.withdrawal.update({
      where: { id: wd.id },
      data: {
        status:       'approved',
        tx_hash:      tx_hash.trim(),
        admin_id:     req.admin.adminId,
        processed_at: new Date(),
      },
    })

    // Email notification — non-blocking
    email.withdrawalApproved({
      to:        wd.user.email,
      name:      wd.user.name,
      netAmount: wd.net_amount,
      txHash:    tx_hash.trim(),
      wallet:    wd.wallet_address,
    })

    res.json({ message: 'Withdrawal approved', tx_hash })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/withdrawals/:id/reject ────────────────────
router.put('/:id/reject', async (req, res, next) => {
  const { reason } = req.body
  try {
    const wd = await prisma.withdrawal.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!wd)                     return res.status(404).json({ error: 'Withdrawal not found' })
    if (wd.status !== 'pending') return res.status(400).json({ error: 'Withdrawal already processed' })

    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: wd.id },
        data:  { status: 'rejected', admin_id: req.admin.adminId, reject_reason: reason || 'Rejected', processed_at: new Date() },
      })
      const updated = await tx.user.update({
        where: { id: wd.user_id },
        data:  { income_wallet_balance: { increment: wd.amount } },
      })
      await tx.incomeLedger.create({
        data: {
          user_id:        wd.user_id,
          type:           'credit',
          amount:         wd.amount,
          balance_after:  updated.income_wallet_balance,
          remarks:        `Withdrawal #${wd.id} rejected — refunded`,
          reference_type: 'withdrawal_refund',
          reference_id:   wd.id,
        },
      })
    })

    // Email notification — non-blocking
    email.withdrawalRejected({
      to:     wd.user.email,
      name:   wd.user.name,
      amount: wd.amount,
      reason: reason || 'Rejected by admin',
    })

    res.json({ message: 'Withdrawal rejected and amount refunded' })
  } catch (err) { next(err) }
})

module.exports = router
