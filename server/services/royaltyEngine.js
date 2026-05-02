const { getLegBusiness } = require('./businessUtils')
const prisma = require('../lib/prisma')
/**
 * Royalty Ranks Configuration
 * Based on 40%-30%-30% Leg Distribution
 */
const ROYALTY_RANKS = [
  { id: 1, name: 'Executive',        target: 500000,   percent: 1 },
  { id: 2, name: 'Senior Executive', target: 1000000,  percent: 2 },
  { id: 3, name: 'Vice President',   target: 2500000,  percent: 3 },
  { id: 4, name: 'CEO',              target: 5000000,  percent: 4 },
  { id: 5, name: 'Chairman',         target: 10000000, percent: 5 }
]

/**
 * Calculate and award royalty ranks based on cumulative business match
 * This runs daily to update the user's royalty_rank
 */
async function updateRoyaltyRanks() {
  console.log('[RoyaltyEngine] Updating royalty ranks...')
  const users = await prisma.user.findMany({
    select: { id: true, royalty_rank_id: true, user_id: true }
  })

  let updateCount = 0

  for (const user of users) {
    const { leg1, leg2, leg3 } = await getLegBusiness(user.id)
    
    // Check highest possible royalty rank
    let qualifiedRank = null
    for (const rank of ROYALTY_RANKS) {
      const T = rank.target
      if (leg1 >= 0.4 * T && leg2 >= 0.3 * T && leg3 >= 0.3 * T) {
        qualifiedRank = rank
      } else {
        break // Stop at the first rank not met
      }
    }

    if (qualifiedRank && qualifiedRank.id > user.royalty_rank_id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          royalty_rank:    qualifiedRank.name,
          royalty_rank_id: qualifiedRank.id
        }
      })
      updateCount++
      console.log(`[RoyaltyEngine] User ${user.user_id} promoted to Royalty Rank: ${qualifiedRank.name}`)
    }
  }
  console.log(`[RoyaltyEngine] Finished updates. Users promoted: ${updateCount}`)
}

/**
 * Distribute Monthly Royalty Income
 * Runs on the 1st of every month
 */
async function distributeMonthlyRoyalty() {
  console.log('[RoyaltyEngine] Starting monthly royalty distribution...')
  
  // Calculate company turnover for the previous month
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  const turnoverRes = await prisma.tradePackage.aggregate({
    where: {
      started_at: {
        gte: firstDayLastMonth,
        lt:  firstDayThisMonth
      }
    },
    _sum: { amount: true }
  })

  const turnover = parseFloat(turnoverRes._sum.amount || 0)
  console.log(`[RoyaltyEngine] Company Turnover (Last Month): $${turnover}`)

  if (turnover <= 0) {
    console.log('[RoyaltyEngine] No turnover last month. Skipping distribution.')
    return
  }

  for (const rank of ROYALTY_RANKS) {
    // Find all users with this EXACT royalty rank (Exclusive)
    // Or if they get share of all pools below them? 
    // Usually royalty is exclusive to your rank or shared. 
    // Wording: "Member will get... if his team reach X". 
    // I'll assume they get the share of their specific pool.
    const qualifiers = await prisma.user.findMany({
      where: { royalty_rank_id: rank.id },
      select: { id: true, user_id: true }
    })

    if (qualifiers.length === 0) continue

    const poolAmount = turnover * rank.percent / 100
    const rewardPerUser = parseFloat((poolAmount / qualifiers.length).toFixed(2))

    console.log(`[RoyaltyEngine] Pool ${rank.name} (${rank.percent}%): $${poolAmount} shared by ${qualifiers.length} users ($${rewardPerUser} each)`)

    for (const user of qualifiers) {
      try {
        await prisma.$transaction(async (tx) => {
          // Credit income wallet
          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: { income_wallet_balance: { increment: rewardPerUser } }
          })

          // Create bonus record
          const bonus = await tx.bonus.create({
            data: {
              user_id: user.id,
              type:    'royalty',
              amount:  rewardPerUser,
              remarks: `Monthly Royalty Income: ${rank.name} Pool`
            }
          })

          // Create ledger entry
          await tx.incomeLedger.create({
            data: {
              user_id:        user.id,
              type:           'credit',
              amount:         rewardPerUser,
              balance_after:  updatedUser.income_wallet_balance,
              remarks:        `Monthly Royalty Income - ${rank.name}`,
              reference_type: 'royalty',
              reference_id:   bonus.id
            }
          })
        })
      } catch (err) {
        console.error(`[RoyaltyEngine] Error rewarding user ${user.user_id}:`, err.message)
      }
    }
  }
  console.log('[RoyaltyEngine] Monthly distribution finished.')
}

module.exports = { updateRoyaltyRanks, distributeMonthlyRoyalty }
