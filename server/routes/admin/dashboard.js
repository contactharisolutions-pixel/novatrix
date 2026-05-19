const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/dashboard ─────────────────────────────────
// Platform-wide KPIs
router.get('/dashboard', async (req, res, next) => {
  try {
    // IST-aware today range
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const nowIST  = new Date(Date.now() + IST_OFFSET_MS)
    const todayStr = nowIST.toISOString().split('T')[0]
    const todayStart = new Date(todayStr + 'T00:00:00+05:30')
    const todayEnd   = new Date(todayStr + 'T23:59:59+05:30')

    const [
      totalMembers, activeMembers, pendingDeposits, pendingWithdrawals,
      pendingKyc, openTickets, totalDepositVol, totalWithdrawVol,
      roiBonus, directBonus, levelBonus, rewardBonus, royaltyBonus,
      todayJoinCount, todayInvestment, totalBusiness,
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
      // Today's new joinings (members who registered today IST)
      prisma.user.count({ where: { created_at: { gte: todayStart, lte: todayEnd } } }),
      // Today's investment — trade packages activated today
      prisma.tradePackage.aggregate({
        where: { started_at: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      // Total business — all-time trade package investment
      prisma.tradePackage.aggregate({ _sum: { amount: true } }),
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
      today: {
        joinings:   todayJoinCount,
        investment: +(todayInvestment._sum.amount || 0),
      },
      total_business: +(totalBusiness._sum.amount || 0),
    })
  } catch (err) { next(err) }
})


module.exports = router
