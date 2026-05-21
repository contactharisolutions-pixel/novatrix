/**
 * Bonus Engine
 * Handles direct referral bonus + 15-level ROI matching commission.
 *
 * Rules:
 * - Direct Referral Bonus: 5% of package amount, paid on activation.
 *   Sponsor must be active AND have activated their own trade package
 *   ON OR BEFORE the member's package activation date.
 *   If sponsor activated AFTER the member → bonus is flushed (not paid).
 * - ROI Matching Bonus: 15-level % of daily ROI, paid daily via cron.
 *   Each level's sponsor must be active AND have at least one active trade package.
 */

const prisma = require('../lib/prisma')

// Default commission rates
const DEFAULT_RATES = {
  direct: 5.0,
  levels: [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5], // index = level
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
 * NOTE: This is called OUTSIDE a transaction for the ROI matching bonus
 * to avoid long-running transaction locks.
 *
 * @param {PrismaClient} client  - Prisma client (tx or global)
 * @param {number} userId
 * @param {number} amount
 * @param {string} bonusType - 'direct' | 'level' | 'trading'
 * @param {number} fromUserId
 * @param {number} level
 * @param {string} remarks
 */
async function creditBonus(client, userId, amount, bonusType, fromUserId, level, remarks) {
  if (amount <= 0) return

  const updated = await client.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  })

  await Promise.all([
    client.bonus.create({
      data: {
        user_id:      userId,
        from_user_id: fromUserId,
        type:         bonusType,
        level,
        amount,
      },
    }),
    client.incomeLedger.create({
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
 * Check whether a user has at least one active trade package.
 * Used to qualify a sponsor for direct or level bonus.
 */
async function hasActivePackage(userId) {
  const pkg = await prisma.tradePackage.findFirst({
    where: { user_id: userId, status: 'active' },
    select: { id: true }
  })
  return pkg !== null
}

/**
 * Trigger direct referral bonus (5%) when a member activates a trade package.
 * Conditions:
 *  - Sponsor must have status === 'active'
 *  - Sponsor must have activated their OWN trade package ON OR BEFORE
 *    the member's activation date. (Sponsor who joined late gets $0 — bonus flushed)
 *
 * @param {number} memberId      - The member who invested
 * @param {number} investment    - The invested amount
 * @param {Date}   activatedAt   - When the member's package was activated (defaults to now)
 */
async function triggerDirectAndLevelBonus(memberId, investment, activatedAt = new Date()) {
  const rates = await getCommissionRates()

  const current = await prisma.user.findUnique({ 
    where: { id: memberId },
    select: { sponsor_id: true, user_id: true }
  })
  if (!current?.sponsor_id) return

  const sponsorId = current.sponsor_id
  
  // Check if sponsor is active AND had an active package on/before member's activation
  const sponsor = await prisma.user.findUnique({ 
    where: { id: sponsorId },
    select: { status: true }
  })

  if (sponsor?.status !== 'active') return

  // KEY RULE: sponsor's earliest package must have been activated <= member's activation date
  const sponsorEarliestPkg = await prisma.tradePackage.findFirst({
    where:   { user_id: sponsorId, status: 'active' },
    orderBy: { started_at: 'asc' },
    select:  { id: true, started_at: true },
  })

  if (!sponsorEarliestPkg) {
    console.log(`[DirectBonus] Sponsor #${sponsorId} has no active package — bonus flushed for member #${memberId}`)
    return
  }

  if (new Date(sponsorEarliestPkg.started_at) > new Date(activatedAt)) {
    console.log(`[DirectBonus] Sponsor #${sponsorId} activated AFTER member #${memberId} — bonus flushed (sponsor: ${sponsorEarliestPkg.started_at}, member: ${activatedAt})`)
    return
  }

  // Sponsor is eligible — credit direct bonus
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

/**
 * Trigger 15-level ROI matching bonus based on daily ROI generated by the downline.
 *
 * FIX #3: This function now runs OUTSIDE the main ROI transaction to prevent
 * long-running transaction locks and Vercel timeout issues.
 * It uses the global `prisma` client (not `tx`) for independent, non-blocking execution.
 *
 * FIX #5: Each level sponsor must be active AND have an active trade package.
 *
 * @param {number} memberId      - The member who generated ROI
 * @param {string} memberUserId  - Display ID for ledger remarks
 * @param {number} roiAmount     - The ROI amount generated
 */
async function triggerROIMatchingBonus(memberId, memberUserId, roiAmount, userMap = null) {
  const rates = await getCommissionRates()
  const LEVEL_RATES = rates.levels

  // Compute today's IST date range for idempotency check
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST        = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr      = nowIST.toISOString().split('T')[0]  // e.g. '2026-05-19'
  const dayStart      = new Date(todayStr + 'T00:00:00+05:30')
  const dayEnd        = new Date(todayStr + 'T23:59:59+05:30')

  // Dynamically build userMap if not provided
  if (!userMap) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        sponsor_id: true,
        status: true,
        packages: {
          where: { status: 'active', started_at: { lte: new Date() } },
          take: 1,
          select: { id: true }
        },
        referrals: {
          select: {
            id: true,
            packages: {
              where: { status: 'active', started_at: { lte: new Date() } },
              take: 1,
              select: { id: true }
            }
          }
        }
      }
    })

    userMap = new Map()
    for (const u of users) {
      const hasActivePkg = u.packages.length > 0
      const activeDownlineCount = u.referrals.filter(ref => ref.packages.length > 0).length
      userMap.set(u.id, {
        sponsor_id: u.sponsor_id,
        status: u.status,
        hasActivePkg,
        activeDownlineCount
      })
    }
  }

  let level = 1

  const member = userMap.get(memberId) || await prisma.user.findUnique({
    where: { id: memberId },
    select: { sponsor_id: true }
  });
  let sponsorId = member?.sponsor_id;

  // Walk up the sponsor chain up to 15 levels
  while (level <= 15 && sponsorId) {
    const sponsor = userMap.get(sponsorId)

    if (!sponsor) break;

    const hasActivePkg = sponsor.hasActivePkg;
    const activeDownlineCount = sponsor.activeDownlineCount;

    // Sponsor must be active AND have at least one active trade package
    if (sponsor.status === 'active' && hasActivePkg) {
      // Gate: sponsor must have at least `level` active investing referrals to earn at this depth
      if (activeDownlineCount >= level) {
        const rate     = LEVEL_RATES[level] || 0
        const bonusAmt = parseFloat((roiAmount * rate / 100).toFixed(2))
        if (bonusAmt > 0) {
          // FIX: Same-day idempotency — skip if this level bonus was already credited today
          const alreadyPaid = await prisma.bonus.findFirst({
            where: {
              user_id:      sponsorId,
              from_user_id: memberId,
              type:         'level',
              level,
              created_at:   { gte: dayStart, lte: dayEnd },
            },
          })

          if (alreadyPaid) {
            console.log(`[Bonus] Level ${level} bonus to sponsor #${sponsorId} from member #${memberId} already paid today — skipping.`)
          } else {
            // Each bonus credit is its own small atomic transaction — avoids giant lock
            await prisma.$transaction(async (tx) => {
              await creditBonus(
                tx,
                sponsorId,
                bonusAmt,
                'level',
                memberId,
                level,
                `Level ${level} ROI matching bonus from ${memberUserId}`,
              )
            })
          }
        }
      }
    }

    sponsorId = sponsor.sponsor_id
    level++
  }
}

module.exports = { triggerDirectAndLevelBonus, triggerROIMatchingBonus }
