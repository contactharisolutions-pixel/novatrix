/**
 * Package Activation Helper
 * Shared transaction-safe logic to activate a trade package for a user
 * after external payment (e.g., NOWPayments crypto) has been confirmed.
 *
 * This keeps the activation logic DRY — usable from both the
 * NOWPayments webhook/status-check and any future payment providers.
 */

const prisma = require('../lib/prisma')
const { triggerDirectAndLevelBonus } = require('./bonusEngine')
const { processRewards }             = require('./rewardEngine')
const { updateRoyaltyRanks }         = require('./royaltyEngine')

// Platform launch date — used for 15-day window ROI multiplier calculation.
const DAY_15_END = new Date('2026-05-17T00:00:00+05:30')

/**
 * Activate a trade package for `userId` funded by an external payment.
 * Also marks the related deposit record as approved.
 *
 * @param {number}  userId    - Internal DB user ID.
 * @param {number}  amount    - USD amount of the package.
 * @param {number}  depositId - ID of the pending Deposit record to mark approved.
 * @returns {object} { packageId }
 */
async function activatePackageAfterPayment(userId, amount, depositId) {
  const amt = parseFloat(amount)

  // Fetch user
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error(`User ${userId} not found`)

  // Calculate max multiplier (2× or 3×) based on 15-day investment window
  const today = new Date()
  const [memberInvestRes] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
    WHERE user_id = ${userId} AND started_at <= ${DAY_15_END}
  `
  let memberInvest15Days = parseFloat(memberInvestRes?.total || 0)
  if (today <= DAY_15_END) memberInvest15Days += amt

  const [teamInvestRes] = await prisma.$queryRaw`
    WITH RECURSIVE tree AS (
      SELECT id FROM "User" WHERE sponsor_id = ${userId}
      UNION ALL
      SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
    )
    SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
    WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${DAY_15_END}
  `
  const teamTotal15Days = parseFloat(teamInvestRes?.total || 0)

  let maxMultiplier = 2
  if (memberInvest15Days > 0 && teamTotal15Days >= 3 * memberInvest15Days) {
    maxMultiplier = 3
  }
  const maxReturn = amt * maxMultiplier

  // Atomic: create package + activate user + approve deposit
  const pkg = await prisma.$transaction(async (tx) => {
    const p = await tx.tradePackage.create({
      data: {
        user_id:           userId,
        amount:            amt,
        daily_roi_percent: 0,  // set by cron on first run
        max_return:        maxReturn,
        status:            'active',
      },
    })

    // Activate user if they were inactive
    if (user.status === 'inactive') {
      await tx.user.update({
        where: { id: userId },
        data:  { status: 'active' },
      })
    }

    // Mark deposit as approved
    if (depositId) {
      await tx.deposit.update({
        where: { id: depositId },
        data:  { status: 'approved', approved_at: new Date() },
      })
    }

    return p
  })

  // Trigger referral bonuses (outside transaction to avoid long locks)
  if (user.sponsor_id) {
    await triggerDirectAndLevelBonus(userId, amt, pkg.started_at, pkg.id).catch(err => {
      console.error('[PackageActivation] Bonus trigger failed:', err.message)
    })
  }

  // Re-evaluate ranks (non-blocking)
  processRewards().catch(console.error)
  updateRoyaltyRanks().catch(console.error)

  console.log(`[PackageActivation] User #${userId} package #${pkg.id} activated — $${amt}, maxReturn: $${maxReturn}`)
  return { packageId: pkg.id }
}

module.exports = { activatePackageAfterPayment }
