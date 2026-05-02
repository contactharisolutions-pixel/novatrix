const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

/** Verify the user's transaction PIN */
async function verifyPin(userId, pin) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user.transaction_pin_hash) throw new Error('Transaction PIN not set. Please set your PIN first.')
  const valid = await bcrypt.compare(pin, user.transaction_pin_hash)
  if (!valid) throw new Error('Invalid transaction PIN')
}

// ─── POST /api/funds/transfer ─────────────────────────────────
// P2P Fund Transfer
router.post('/transfer', async (req, res, next) => {
  const { receiverUserId, amount, pin } = req.body
  const amt = parseFloat(amount)

  if (!receiverUserId || !amt || amt <= 0 || !pin) {
    return res.status(400).json({ error: 'Receiver ID, positive amount, and PIN are required' })
  }

  try {
    await verifyPin(req.user.id, pin)

    const sender = await prisma.user.findUnique({ where: { id: req.user.id } })
    const receiver = await prisma.user.findUnique({ where: { user_id: receiverUserId } })

    if (!receiver) return res.status(404).json({ error: 'Receiver member not found' })
    if (receiver.id === sender.id) return res.status(400).json({ error: 'Cannot transfer to yourself' })
    if (parseFloat(sender.fund_wallet_balance) < amt) return res.status(400).json({ error: 'Insufficient fund wallet balance' })

    await prisma.$transaction(async (tx) => {
      // 1. Deduct from sender
      const updatedSender = await tx.user.update({
        where: { id: sender.id },
        data: { fund_wallet_balance: { decrement: amt } }
      })

      // 2. Add to receiver
      const updatedReceiver = await tx.user.update({
        where: { id: receiver.id },
        data: { fund_wallet_balance: { increment: amt } }
      })

      // 3. Create transfer record
      const transfer = await tx.fundTransfer.create({
        data: {
          sender_id:   sender.id,
          receiver_id: receiver.id,
          amount:      amt,
          remarks:     `P2P Transfer to ${receiverUserId}`
        }
      })

      // 4. Sender Ledger
      await tx.fundLedger.create({
        data: {
          user_id:        sender.id,
          type:           'debit',
          amount:         amt,
          balance_after:  updatedSender.fund_wallet_balance,
          remarks:        `P2P Transfer to ${receiverUserId} (#${receiver.name})`,
          reference_type: 'transfer_out',
          reference_id:   transfer.id
        }
      })

      // 5. Receiver Ledger
      await tx.fundLedger.create({
        data: {
          user_id:        receiver.id,
          type:           'credit',
          amount:         amt,
          balance_after:  updatedReceiver.fund_wallet_balance,
          remarks:        `P2P Transfer from ${sender.user_id} (#${sender.name})`,
          reference_type: 'transfer_in',
          reference_id:   transfer.id
        }
      })
    })

    res.json({ message: `Successfully transferred $${amt} to ${receiver.name} (${receiverUserId})` })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─── GET /api/funds/history ───────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const records = await prisma.fundLedger.findMany({
      where:   { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take:    50
    })
    res.json({ records })
  } catch (err) { next(err) }
})

module.exports = router
