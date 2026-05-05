const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/dashboard ─────────────────────────────────
// Platform-wide KPIs
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalMembers, activeMembers, pendingDeposits, pendingWithdrawals,
      pendingKyc, openTickets, totalDepositVol, totalWithdrawVol,
      roiBonus, directBonus, levelBonus, rewardBonus, royaltyBonus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.deposit.count({ where: { status: 'pending' } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.kycDocument.count({ where: { status: 'pending' } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.deposit.aggregate({ where:    { status: 'approved' }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { status: 'approved' }, _sum: { net_amount: true } }),
      // Per-type bonus aggregates
      prisma.bonus.aggregate({ where: { type: 'trading' }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { type: 'direct'  }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { type: 'level'   }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { type: 'reward'  }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { type: 'royalty' }, _sum: { amount: true } }),
    ])

    const sevenDaysAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newMembersWeek = await prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } })

    const roi     = +(roiBonus._sum.amount     || 0)
    const direct  = +(directBonus._sum.amount  || 0)
    const level   = +(levelBonus._sum.amount   || 0)
    const reward  = +(rewardBonus._sum.amount  || 0)
    const royalty = +(royaltyBonus._sum.amount || 0)

    res.json({
      members:         { total: totalMembers, active: activeMembers, new_this_week: newMembersWeek },
      pending_actions: { deposits: pendingDeposits, withdrawals: pendingWithdrawals, kyc: pendingKyc, tickets: openTickets },
      financials: {
        total_deposits:    +(totalDepositVol._sum.amount      || 0),
        total_withdrawals: +(totalWithdrawVol._sum.net_amount || 0),
        total_bonuses:     roi + direct + level + reward + royalty,
        // Breakdown by income type
        roi_paid:     roi,
        direct_paid:  direct,
        level_paid:   level,
        reward_paid:  reward,
        royalty_paid: royalty,
      },
    })
  } catch (err) { next(err) }
})


module.exports = router
