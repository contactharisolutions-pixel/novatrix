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
      pendingKyc, openTickets, totalDepositVol, totalWithdrawVol, totalBonuses,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.deposit.count({ where: { status: 'pending' } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.kycDocument.count({ where: { status: 'pending' } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.deposit.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { status: 'approved' }, _sum: { net_amount: true } }),
      prisma.bonus.aggregate({ _sum: { amount: true } }),
    ])

    // Recent activity (last 7 days signups)
    const sevenDaysAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newMembersWeek = await prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } })

    res.json({
      members:           { total: totalMembers, active: activeMembers, new_this_week: newMembersWeek },
      pending_actions:   { deposits: pendingDeposits, withdrawals: pendingWithdrawals, kyc: pendingKyc, tickets: openTickets },
      financials: {
        total_deposits:  +(totalDepositVol._sum.amount   || 0),
        total_withdrawals: +(totalWithdrawVol._sum.net_amount || 0),
        total_bonuses:   +(totalBonuses._sum.amount      || 0),
      },
    })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/reports/csv ───────────────────────────────
// Query: ?type=members|deposits|withdrawals
router.get('/reports/csv', async (req, res, next) => {
  const type = req.query.type || 'members'

  try {
    let rows = [], headers = []

    if (type === 'members') {
      const members = await prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          user_id: true, name: true, email: true, phone: true,
          status: true, fund_wallet_balance: true, income_wallet_balance: true,
          referral_code: true, created_at: true,
          sponsor: { select: { user_id: true } },
        },
      })
      headers = ['user_id','name','email','phone','status','fund_wallet','income_wallet','referral_code','sponsor_id','joined']
      rows = members.map((m) => [
        m.user_id, m.name, m.email, m.phone, m.status,
        m.fund_wallet_balance, m.income_wallet_balance,
        m.referral_code, m.sponsor?.user_id || '',
        new Date(m.created_at).toISOString(),
      ])
    } else if (type === 'deposits') {
      const deposits = await prisma.deposit.findMany({
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true } } },
      })
      headers = ['id','user_id','member_name','amount','tx_hash','status','date']
      rows = deposits.map((d) => [
        d.id, d.user.user_id, d.user.name, d.amount, d.tx_hash || '', d.status,
        new Date(d.created_at).toISOString(),
      ])
    } else if (type === 'withdrawals') {
      const wds = await prisma.withdrawal.findMany({
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true } } },
      })
      headers = ['id','user_id','member_name','amount','fee','net','wallet','tx_hash','status','date']
      rows = wds.map((w) => [
        w.id, w.user.user_id, w.user.name, w.amount, w.fee, w.net_amount,
        w.wallet_address, w.tx_hash || '', w.status,
        new Date(w.created_at).toISOString(),
      ])
    } else if (type === 'bonuses') {
      const bonuses = await prisma.bonus.findMany({
        orderBy: { created_at: 'desc' },
        include: { 
          user: { select: { user_id: true, name: true } },
          from_user: { select: { user_id: true, name: true } }
        },
      })
      headers = ['id','recipient_id','recipient_name','type','amount','from_id','from_name','level','remarks','date']
      rows = bonuses.map((b) => [
        b.id, b.user.user_id, b.user.name, b.type, b.amount,
        b.from_user?.user_id || 'system', b.from_user?.name || 'system',
        b.level || '', b.remarks || '',
        new Date(b.created_at).toISOString(),
      ])
    } else {
      return res.status(400).json({ error: 'Invalid report type' })
    }

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`)
    res.send(csv)
  } catch (err) { next(err) }
})

// ─── GET /api/admin/reports/roi ───────────────────────────────
// Last 30 days ROI distribution summary
router.get('/reports/roi', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const distributions = await prisma.roiDistribution.findMany({
      where:   { created_at: { gte: thirtyDaysAgo } },
      orderBy: { created_at: 'asc' },
      select:  { amount: true, created_at: true },
    })
    const byDay = {}
    distributions.forEach((d) => {
      const day = d.created_at.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] || 0) + +d.amount
    })
    res.json({ roi_history: Object.entries(byDay).map(([date, total]) => ({ date, total: +total.toFixed(2) })) })
  } catch (err) { next(err) }
})

module.exports = router
