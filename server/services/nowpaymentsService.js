/**
 * NOWPayments Service
 * Wraps all communication with the NOWPayments REST API.
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */

const crypto = require('crypto')

const BASE_URL = 'https://api.nowpayments.io/v1'
const API_KEY  = process.env.NOWPAYMENTS_API_KEY

/**
 * Create a new crypto payment.
 * @param {number}  priceAmount   - The USD dollar amount to charge.
 * @param {string}  payCurrency   - Crypto symbol (e.g. 'usdttrc20', 'btc').
 * @param {string}  orderId       - Internal order identifier (deposit record ID as string).
 * @param {string}  callbackUrl   - IPN webhook URL.
 * @returns {object} NOWPayments payment object.
 */
async function createPayment(priceAmount, payCurrency, orderId, callbackUrl) {
  const response = await fetch(`${BASE_URL}/payment`, {
    method: 'POST',
    headers: {
      'x-api-key':    API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount:    priceAmount,
      price_currency:  'usd',
      pay_currency:    payCurrency,
      ipn_callback_url: callbackUrl,
      order_id:        orderId,
      order_description: `Novatrix Trade Package - $${priceAmount}`,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.message || data?.error || 'NOWPayments API error'
    throw new Error(message)
  }

  return data
}

/**
 * Fetch live status of a payment by ID.
 * @param {string|number} paymentId
 * @returns {object} NOWPayments payment status object.
 */
async function getPaymentStatus(paymentId) {
  const response = await fetch(`${BASE_URL}/payment/${paymentId}`, {
    method: 'GET',
    headers: { 'x-api-key': API_KEY },
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.message || data?.error || 'NOWPayments API error'
    throw new Error(message)
  }

  return data
}

/**
 * Verify the HMAC-SHA512 signature of an incoming IPN webhook.
 * Keys must be sorted alphabetically before hashing.
 *
 * @param {object} body      - Parsed JSON body from the webhook request.
 * @param {string} signature - Value of x-nowpayments-sig header.
 * @returns {boolean}
 */
function verifySignature(body, signature) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) {
    // If secret is not configured, warn and allow through in dev (but not in prod)
    if (process.env.NODE_ENV === 'production') {
      console.error('[NOWPayments] NOWPAYMENTS_IPN_SECRET not set — rejecting webhook in production')
      return false
    }
    console.warn('[NOWPayments] NOWPAYMENTS_IPN_SECRET not set — skipping signature check in dev mode')
    return true
  }

  const sortedString = JSON.stringify(body, Object.keys(body).sort())
  const hmac = crypto.createHmac('sha512', secret)
  hmac.update(sortedString)
  const calculated = hmac.digest('hex')
  return calculated === signature
}

/**
 * Fetch the list of available currencies from NOWPayments.
 * Used to populate the currency selector on the frontend.
 * @returns {string[]} Array of available pay_currency codes.
 */
async function getAvailableCurrencies() {
  const response = await fetch(`${BASE_URL}/currencies?fixed_rate=false`, {
    method: 'GET',
    headers: { 'x-api-key': API_KEY },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch currencies')
  }

  return data?.currencies || []
}

module.exports = { createPayment, getPaymentStatus, verifySignature, getAvailableCurrencies }
