const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
const FEE_PERCENT = 10  // 10% withdrawal fee

router.use(authenticate)

// ─── POST /api/withdrawals/request ───────────────────────────
router.post('/request', async (req, res, next) => {
  const { amount, pin } = req.body
  
  // 1. Time & Day Check (Mon-Fri, 6:00 AM - 11:00 AM IST)
  // Use UTC offset math to get reliable IST time (UTC+5:30 = +330 minutes)
  // avoids the Node.js toLocaleString + new Date() timezone bug on Vercel (UTC servers)
  const now = new Date()
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // 5 hours 30 minutes
  const istDate = new Date(now.getTime() + IST_OFFSET_MS)
  const day  = istDate.getUTCDay()   // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hour = istDate.getUTCHours()

  if (day === 0 || day === 6) {
    return res.status(400).json({ error: 'Withdrawals are allowed from Monday to Friday only.' })
  }
  if (hour < 6 || hour >= 11) {
    return res.status(400).json({ error: 'Withdrawal window is 6:00 AM to 11:00 AM IST.' })
  }

  // 2. Amount Validation
  const amt = parseFloat(amount)
  if (!amt || amt < 20) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is $20.' })
  }
  if (amt > 5000) {
    return res.status(400).json({ error: 'Maximum withdrawal amount is $5,000 per request.' })
  }
  if (amt % 10 !== 0) {
    return res.status(400).json({ error: 'Withdrawal amount must be in multiples of $10 (e.g., $20, $30, $40).' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user.bep20_wallet)          return res.status(400).json({ error: 'No withdrawal wallet address set. Please add your wallet in Wallet Setup.' })
    if (!user.transaction_pin_hash)  return res.status(400).json({ error: 'Transaction PIN not set' })
    const valid = await bcrypt.compare(pin, user.transaction_pin_hash)
    if (!valid)                      return res.status(401).json({ error: 'Invalid transaction PIN' })
    if (parseFloat(user.income_wallet_balance) < amt) return res.status(400).json({ error: 'Insufficient income wallet balance' })

    const fee        = parseFloat((amt * FEE_PERCENT / 100).toFixed(2))
    const net_amount = parseFloat((amt - fee).toFixed(2))

    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user.id },
        data:  { income_wallet_balance: { decrement: parseFloat(amount) } },
      })
      await tx.withdrawal.create({
        data: {
          user_id:       req.user.id,
          amount:        parseFloat(amount),
          fee,
          net_amount,
          wallet_address: user.bep20_wallet,
          status:        'pending',
        },
      })
      await tx.incomeLedger.create({
        data: {
          user_id:        req.user.id,
          type:           'debit',
          amount:         parseFloat(amount),
          balance_after:  updated.income_wallet_balance,
          remarks:        `Withdrawal request ($${net_amount} net)`,
          reference_type: 'withdrawal',
        },
      })
    })

    res.status(201).json({ message: 'Withdrawal request submitted. Processing within 24 hours.', net_amount })
  } catch (err) { next(err) }
})

// ─── GET /api/withdrawals/history ────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where:   { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    })
    res.json({ withdrawals })
  } catch (err) { next(err) }
})

module.exports = router
