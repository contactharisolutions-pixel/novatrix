const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

// ─── GET /api/income-wallet/ledger ────────────────────────────
router.get('/ledger', async (req, res, next) => {
  try {
    const ledger = await prisma.incomeLedger.findMany({
      where:   { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take:    100,
    })
    res.json({ ledger })
  } catch (err) { next(err) }
})

// ─── POST /api/income-wallet/fund-transfer ────────────────────
// Transfer from Income Wallet → Fund Wallet
router.post('/fund-transfer', async (req, res, next) => {
  const { amount, pin } = req.body
  if (!amount || amount < 10) return res.status(400).json({ error: 'Minimum transfer is $10' })

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user.transaction_pin_hash) return res.status(400).json({ error: 'Set a transaction PIN first' })
    const valid = await bcrypt.compare(pin, user.transaction_pin_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid transaction PIN' })
    if (user.income_wallet_balance < amount) return res.status(400).json({ error: 'Insufficient income wallet balance' })

    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user.id },
        data: {
          income_wallet_balance: { decrement: parseFloat(amount) },
          fund_wallet_balance:   { increment: parseFloat(amount) },
        },
      })
      await tx.incomeLedger.create({
        data: {
          user_id:        req.user.id,
          type:           'debit',
          amount:         parseFloat(amount),
          balance_after:  updated.income_wallet_balance,
          remarks:        'Fund Transfer to Fund Wallet',
          reference_type: 'fund_transfer',
        },
      })
    })

    res.json({ message: `$${amount} transferred to Fund Wallet` })
  } catch (err) { next(err) }
})

module.exports = router
