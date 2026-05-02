/**
 * Bonus Engine
 * Handles direct referral bonus + 10-level commission distribution.
 *
 * Level Commission Matrix (configurable via DB settings):
 * Level 1: 5%, Level 2: 3%, Level 3: 2%, Level 4-10: 1% each
 */

const prisma = require('../lib/prisma')
// Default commission rates
const DEFAULT_RATES = {
  direct: 5.0, // Fixed 5% direct referral bonus
  levels: [0, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Level 1 is direct, Levels 2-15 handled here
}

async function getCommissionRates() {
  try {
    const [levelsSetting, directSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'level_bonus_rates' } }),
      prisma.setting.findUnique({ where: { key: 'direct_bonus_pct' } })
    ])
    return {
      direct: directSetting ? parseFloat(directSetting.value) : DEFAULT_RATES.direct,
      levels: levelsSetting ? JSON.parse(levelsSetting.value) : DEFAULT_RATES.levels,
    }
  } catch {
    return DEFAULT_RATES
  }
}

/**
 * Credit a bonus to a user's income wallet and create ledger entry.
 * @param {PrismaClient} tx  - Transaction client
 * @param {number} userId
 * @param {number} amount
 * @param {string} bonusType - 'direct' | 'level' | 'trading'
 * @param {number} fromUserId
 * @param {number} level
 * @param {string} remarks
 */
async function creditBonus(tx, userId, amount, bonusType, fromUserId, level, remarks) {
  if (amount <= 0) return

  const updated = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  })

  await Promise.all([
    tx.bonus.create({
      data: {
        user_id:      userId,
        from_user_id: fromUserId,
        type:         bonusType,
        level,
        amount,
      },
    }),
    tx.incomeLedger.create({
      data: {
        user_id:        userId,
        type:           'credit',
        amount,
        balance_after:  updated.income_wallet_balance,
        remarks,
        reference_type: 'bonus',
      },
    }),
  ])
}

/**
 * Trigger direct referral bonus (5%) and up to 15-level commissions 
 * when a member activates a trade package (calculated immediately 24x7).
 *
 * @param {number} memberId   - The member who invested
 * @param {number} investment - The invested amount
 */
async function triggerDirectAndLevelBonus(memberId, investment) {
  const rates = await getCommissionRates()
  // Level commission rates: index corresponds to level (1-based)
  // Level 1 = direct referral bonus (handled separately below)
  // Levels 2-15 = team/level bonuses
  const LEVEL_RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 1, 1, 1, 1, 1, 0.5, 0.5]
  //                   ^0  ^1  ^2  ^3  ^4  ^5  ^6  ^7  ^8  ^9 ^10 ^11 ^12 ^13 ^14 ^15

  let currentId = memberId
  let level = 1

  while (level <= 15) {
    const current = await prisma.user.findUnique({ 
      where: { id: currentId },
      select: { sponsor_id: true, user_id: true }
    })
    if (!current?.sponsor_id) break

    const sponsorId = current.sponsor_id
    
    // Check if sponsor is active
    const sponsor = await prisma.user.findUnique({ 
      where: { id: sponsorId },
      select: { status: true }
    })

    if (sponsor?.status === 'active') {
      // ── Direct Bonus (Level 1 only, 5%) ──────────────────────
      if (level === 1) {
        const directBonusAmt = parseFloat((investment * rates.direct / 100).toFixed(2))
        if (directBonusAmt > 0) {
          await prisma.$transaction(async (tx) => {
            await creditBonus(
              tx,
              sponsorId,
              directBonusAmt,
              'direct',
              memberId,
              1,
              `Direct referral bonus from ${current.user_id}`
            )
          })
        }
      }

      // ── Level Bonus (Levels 1–15) — conditional on direct active count ──
      // Skip duplicate level-1 re-payment (already covered as direct bonus above)
      if (level >= 2) {
        const directActives = await prisma.user.count({
          where: { sponsor_id: sponsorId, status: 'active' }
        })

        // Sponsor must have at least `level` active direct referrals to qualify
        if (directActives >= level) {
          const rate = LEVEL_RATES[level] || 0
          const bonusAmt = parseFloat((investment * rate / 100).toFixed(2))
          if (bonusAmt > 0) {
            await prisma.$transaction(async (tx) => {
              await creditBonus(
                tx,
                sponsorId,
                bonusAmt,
                'level',
                memberId,
                level,
                `Level ${level} team bonus from ${current.user_id}`
              )
            })
          }
        }
      }
    }

    currentId = sponsorId
    level++
  }
}

module.exports = { triggerDirectAndLevelBonus }
