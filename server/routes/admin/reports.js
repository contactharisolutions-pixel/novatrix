const XLSX              = require('xlsx')
const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const { getLegBusiness } = require('../../services/businessUtils')

const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/reports/csv ───────────────────────────────
// Handles both CSV and Excel based on ?format=excel
router.get('/csv', async (req, res, next) => {
  const type   = req.query.type   || 'members'
  const format = req.query.format || 'csv'
  const from   = req.query.from ? new Date(req.query.from) : undefined
  const to     = req.query.to   ? new Date(req.query.to)   : undefined

  try {
    let rows = [], headers = []
    const dateRange = (from || to) ? { created_at: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}

    if (type === 'members') {
      const members = await prisma.user.findMany({
        where: dateRange,
        orderBy: { created_at: 'desc' },
        select: {
          user_id: true, name: true, email: true, phone: true,
          status: true, fund_wallet_balance: true, income_wallet_balance: true,
          referral_code: true, created_at: true,
          sponsor: { select: { user_id: true } },
        },
      })
      headers = ['User ID', 'Name', 'Email', 'Phone', 'Status', 'Fund Wallet', 'Profit Wallet', 'Ref Code', 'Sponsor ID', 'Joined At']
      rows = members.map((m) => [
        m.user_id, m.name, m.email, m.phone, m.status,
        m.fund_wallet_balance, m.income_wallet_balance,
        m.referral_code, m.sponsor?.user_id || 'System',
        m.created_at.toISOString(),
      ])
    } else if (type === 'deposits') {
      const deposits = await prisma.deposit.findMany({
        where: dateRange,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true } } },
      })
      headers = ['ID', 'User ID', 'Name', 'Amount', 'TxHash', 'Status', 'Date']
      rows = deposits.map((d) => [
        d.id, d.user.user_id, d.user.name, d.amount, d.tx_hash || '', d.status,
        d.created_at.toISOString(),
      ])
    } else if (type === 'withdrawals') {
      const wds = await prisma.withdrawal.findMany({
        where: dateRange,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { user_id: true, name: true } } },
      })
      headers = ['ID', 'User ID', 'Name', 'Amount', 'Fee', 'Net', 'Wallet', 'Status', 'Date']
      rows = wds.map((w) => [
        w.id, w.user.user_id, w.user.name, w.amount, w.fee, w.net_amount,
        w.wallet_address, w.status,
        w.created_at.toISOString(),
      ])
    } else if (type === 'bonuses') {
      const bonuses = await prisma.bonus.findMany({
        where: dateRange,
        orderBy: { created_at: 'desc' },
        include: { 
          user: { select: { user_id: true, name: true } },
          from_user: { select: { user_id: true, name: true } }
        },
      })
      headers = ['ID', 'Recipient ID', 'Recipient Name', 'Type', 'Amount', 'From ID', 'From Name', 'Level', 'Remarks', 'Date']
      rows = bonuses.map((b) => [
        b.id, b.user.user_id, b.user.name, b.type, b.amount,
        b.from_user?.user_id || 'system', b.from_user?.name || 'system',
        b.level || '', b.remarks || '',
        b.created_at.toISOString(),
      ])
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase())
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=novatrix-${type}-report.xlsx`)
      return res.send(buf)
    }

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=novatrix-${type}-report.csv`)
    res.send(csvContent)
  } catch (err) { next(err) }
})

// ─── GET /api/admin/reports/business ─────────────────────────
// Deep analysis of team business volumes
router.get('/business', async (req, res, next) => {
  const search = req.query.search || ''
  try {
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { user_id: { contains: search, mode: 'insensitive' } },
          { name:    { contains: search, mode: 'insensitive' } },
        ]
      },
      select: { id: true, user_id: true, name: true, status: true },
      take: 50 // Limit for performance if many
    })

    const detailed = await Promise.all(members.map(async (m) => {
      const legs = await getLegBusiness(m.id)
      const totalTeam = legs.leg1 + legs.leg2 + legs.leg3
      return { ...m, ...legs, totalTeam }
    }))

    res.json({ reports: detailed })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/reports/incomes ─────────────────────────
// Detailed income reporting for ROI, Direct, Level, Reward, Royalty
router.get('/incomes', async (req, res, next) => {
  // The client tab uses 'roi' as the ID but the Bonus enum stores it as 'trading'
  const rawType = req.query.type || 'roi'
  const type    = rawType === 'roi' ? 'trading' : rawType

  const search = req.query.search || ''
  const from   = req.query.from ? new Date(req.query.from) : undefined
  // Make 'to' end-of-day so records created ON that date are included
  const toRaw  = req.query.to
  const to     = toRaw ? (() => { const d = new Date(toRaw); d.setHours(23, 59, 59, 999); return d })() : undefined
  const page   = parseInt(req.query.page  || '1')
  const limit  = parseInt(req.query.limit || '20')

  try {
    const where = {
      ...(type !== 'all' && { type }),
      ...( (from || to) && { created_at: { ...(from && { gte: from }), ...(to && { lte: to }) } } ),
      ...(search && {
        user: {
          OR: [
            { user_id: { contains: search, mode: 'insensitive' } },
            { name:    { contains: search, mode: 'insensitive' } },
          ]
        }
      })
    }

    const [bonuses, total] = await Promise.all([
      prisma.bonus.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user:      { select: { user_id: true, name: true } },
          from_user: { select: { user_id: true, name: true } }
        }
      }),
      prisma.bonus.count({ where })
    ])

    res.json({ reports: bonuses, total, pages: Math.ceil(total / limit) })
  } catch (err) { next(err) }
})
// ─── GET /api/admin/reports/roi ───────────────────────────────
// Last 30 days ALL-TYPE profit payout summary (aggregated by day)
// Used by the admin dashboard "Profit Payout Chart"
router.get('/roi', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const bonuses = await prisma.bonus.findMany({
      where:   { created_at: { gte: thirtyDaysAgo } },
      orderBy: { created_at: 'asc' },
      select:  { amount: true, type: true, created_at: true },
    })

    // Aggregate per IST day (UTC+5:30) — total + per-type breakdown.
    // Using UTC dates caused bonuses on the same IST calendar day to appear on
    // different chart dates (e.g. 00:15 IST → 18:45 UTC prev day).
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const byDay = {}
    bonuses.forEach((b) => {
      const istDate = new Date(b.created_at.getTime() + IST_OFFSET_MS)
      const day = istDate.toISOString().slice(0, 10)
      if (!byDay[day]) byDay[day] = { total: 0, trading: 0, direct: 0, level: 0, reward: 0, royalty: 0 }
      byDay[day].total   += +b.amount
      byDay[day][b.type] += +b.amount
    })

    const roi_history = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        total:   +vals.total.toFixed(2),
        trading: +vals.trading.toFixed(2),
        direct:  +vals.direct.toFixed(2),
        level:   +vals.level.toFixed(2),
        reward:  +vals.reward.toFixed(2),
        royalty: +vals.royalty.toFixed(2),
      }))

    res.json({ roi_history })
  } catch (err) { next(err) }
})

module.exports = router
