/**
 * NOWPayments Routes — /api/nowpayments
 *
 * POST /api/nowpayments/create-payment    — Initiate a new crypto payment
 * GET  /api/nowpayments/payment-status/:id — Poll payment status (and auto-activate on finish)
 * POST /api/nowpayments/webhook           — IPN webhook from NOWPayments
 * GET  /api/nowpayments/currencies        — List supported pay currencies
 */

const router       = require('express').Router()
const authenticate = require('../middleware/authenticate')
const prisma       = require('../lib/prisma')
const {
  createPayment,
  getPaymentStatus,
  verifySignature,
} = require('../services/nowpaymentsService')
const { activatePackageAfterPayment } = require('../services/packageActivation')

// ─── Helpers ──────────────────────────────────────────────────

/** Derive the public IPN callback URL for this server */
function buildCallbackUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol
  const host     = req.headers['x-forwarded-host']  || req.get('host')
  const base     = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '')
  return `${base}/api/nowpayments/webhook`
}

/** Shared: activate package if payment is finished and not yet processed */
async function tryActivateFromPayment(payment) {
  if (payment.payment_status !== 'finished') return null

  // Find the pending deposit linked to this payment's order_id
  const depositId = parseInt(payment.order_id)
  if (!depositId || isNaN(depositId)) return null

  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } })
  if (!deposit) {
    console.warn(`[NOWPayments] No deposit found for order_id ${payment.order_id}`)
    return null
  }

  // Idempotency: skip if already processed
  if (deposit.status === 'approved') {
    console.log(`[NOWPayments] Deposit #${depositId} already approved — skipping activation`)
    return { already_activated: true }
  }

  const result = await activatePackageAfterPayment(deposit.user_id, deposit.amount, deposit.id)
  return result
}

// ─── GET /api/nowpayments/currencies ─────────────────────────
// Only USDT BEP-20 (BNB Smart Chain) is accepted.

router.get('/currencies', async (req, res) => {
  // Only USDT BEP-20 (BNB Chain) is supported
  res.json({ currencies: ['usdtbsc'] })
})

// ─── POST /api/nowpayments/create-payment ────────────────────
// Initiates a new crypto payment. Creates a pending Deposit record and
// returns the crypto payment details (address, amount, QR data).
router.post('/create-payment', authenticate, async (req, res) => {
  const { amount, pay_currency } = req.body

  const amt = parseFloat(amount)
  if (!amt || amt < 20) return res.status(400).json({ error: 'Minimum investment is $20' })
  if (amt > 5000)       return res.status(400).json({ error: 'Maximum investment is $5,000' })
  if (amt % 10 !== 0)   return res.status(400).json({ error: 'Amount must be a multiple of $10' })
  if (!pay_currency)    return res.status(400).json({ error: 'pay_currency is required' })

  try {
    // 1. Create a pending deposit record (tx_hash will store the NOWPayments payment_id)
    const deposit = await prisma.deposit.create({
      data: {
        user_id: req.user.id,
        amount:  amt,
        status:  'pending',
        note:    `NOWPayments crypto payment — ${pay_currency.toUpperCase()}`,
      },
    })

    // 2. Call NOWPayments API to create the payment
    const callbackUrl = buildCallbackUrl(req)
    const payment = await createPayment(amt, pay_currency, deposit.id.toString(), callbackUrl)

    // 3. Store the NOWPayments payment_id in tx_hash for reference
    await prisma.deposit.update({
      where: { id: deposit.id },
      data:  { tx_hash: payment.payment_id?.toString() },
    })

    res.json({
      deposit_id:     deposit.id,
      payment_id:     payment.payment_id,
      payment_status: payment.payment_status,
      pay_address:    payment.pay_address,
      pay_amount:     payment.pay_amount,
      pay_currency:   payment.pay_currency,
      expiration_estimate_date: payment.expiration_estimate_date,
    })
  } catch (err) {
    console.error('[NOWPayments] /create-payment error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to create payment' })
  }
})

// ─── GET /api/nowpayments/payment-status/:paymentId ──────────
// Polls the live status from NOWPayments. If finished, auto-activates.
router.get('/payment-status/:paymentId', authenticate, async (req, res) => {
  const { paymentId } = req.params

  try {
    const payment = await getPaymentStatus(paymentId)

    let activationResult = null
    if (payment.payment_status === 'finished') {
      activationResult = await tryActivateFromPayment(payment)
    }

    res.json({
      payment_status:    payment.payment_status,
      actually_paid:     payment.actually_paid,
      pay_amount:        payment.pay_amount,
      pay_currency:      payment.pay_currency,
      outcome:           payment.outcome,
      activated:         activationResult && !activationResult.already_activated,
      already_activated: activationResult?.already_activated || false,
    })
  } catch (err) {
    console.error('[NOWPayments] /payment-status error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to fetch payment status' })
  }
})

// ─── POST /api/nowpayments/webhook ───────────────────────────
// IPN callback from NOWPayments. Responds 200 immediately to prevent retries.
// Uses raw body for signature verification — must be mounted BEFORE global JSON parser
// captures it. We parse it manually here.
router.post('/webhook', async (req, res) => {
  // Respond 200 immediately to avoid NOWPayments retrying
  res.status(200).send('OK')

  try {
    const signature = req.headers['x-nowpayments-sig']
    const body      = req.body  // parsed JSON (express.json() runs before this)

    if (!body || typeof body !== 'object') {
      console.warn('[NOWPayments] Webhook received with empty/invalid body')
      return
    }

    // Signature verification
    if (!verifySignature(body, signature)) {
      console.error('[NOWPayments] Webhook signature mismatch — discarding')
      return
    }

    console.log(`[NOWPayments] Webhook received — payment_id: ${body.payment_id}, status: ${body.payment_status}`)

    await tryActivateFromPayment(body)
  } catch (err) {
    console.error('[NOWPayments] Webhook processing error:', err.message)
  }
})

// ─── POST /api/nowpayments/simulate-payment (DEV ONLY) ────────
// Simulates a successful NOWPayments IPN webhook for a given deposit_id.
// This lets you test the full activation flow locally without a real payment.
// ONLY available in development mode — returns 404 in production.
router.post('/simulate-payment', authenticate, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  const { deposit_id } = req.body
  if (!deposit_id) return res.status(400).json({ error: 'deposit_id required' })

  try {
    const deposit = await prisma.deposit.findUnique({ where: { id: parseInt(deposit_id) } })
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' })
    if (deposit.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' })
    if (deposit.status === 'approved') return res.json({ message: 'Already activated', already_activated: true })

    const result = await activatePackageAfterPayment(deposit.user_id, deposit.amount, deposit.id)

    console.log(`[NOWPayments][DEV] Simulated payment for deposit #${deposit_id} — package #${result.packageId} activated`)
    res.json({ message: 'Simulated payment successful', ...result, activated: true })
  } catch (err) {
    console.error('[NOWPayments][DEV] Simulation error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
