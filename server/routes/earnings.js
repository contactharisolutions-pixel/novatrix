const router       = require('express').Router()
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

// ─── GET /api/earnings/summary ────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const [roi, direct, level, reward, royalty] = await Promise.all([
      prisma.bonus.aggregate({ where: { user_id: req.user.id, type: 'trading' }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { user_id: req.user.id, type: 'direct'  }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { user_id: req.user.id, type: 'level'   }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { user_id: req.user.id, type: 'reward'  }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { user_id: req.user.id, type: 'royalty' }, _sum: { amount: true } }),
    ])
    const trading_income = +(roi._sum.amount     || 0)
    const direct_bonus   = +(direct._sum.amount  || 0)
    const level_bonus    = +(level._sum.amount   || 0)
    const reward_income  = +(reward._sum.amount  || 0)
    const royalty_income = +(royalty._sum.amount || 0)

    res.json({ 
      total: trading_income + direct_bonus + level_bonus + reward_income + royalty_income, 
      trading_income, 
      direct_bonus, 
      level_bonus,
      reward_income,
      royalty_income
    })
  } catch (err) { next(err) }
})

// ─── GET /api/earnings/history ────────────────────────────────
// Last 30 days of ALL bonus types aggregated per day for the area chart.
// Previously only counted 'trading' type — now sums all income types so the
// chart total matches the "Total Earned" KPI card.
router.get('/history', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const records = await prisma.bonus.findMany({
      where:   { user_id: req.user.id, created_at: { gte: thirtyDaysAgo } }, // all types
      orderBy: { created_at: 'asc' },
      select:  { amount: true, created_at: true },
    })

    // Aggregate by IST day (UTC+5:30) so chart dates align with member's timezone
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const byDay = {}
    records.forEach((r) => {
      const istDate = new Date(r.created_at.getTime() + IST_OFFSET_MS)
      const day = istDate.toISOString().slice(0, 10)
      byDay[day] = (byDay[day] || 0) + +r.amount
    })

    res.json({
      history: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, earning]) => ({ date, earning: +earning.toFixed(2) })),
    })
  } catch (err) { next(err) }
})

// ─── GET /api/earnings/report ─────────────────────────────────
// Query: ?type=trading|direct|level|reward|royalty
router.get('/report', async (req, res, next) => {
  const { type } = req.query
  if (!['trading', 'direct', 'level', 'reward', 'royalty'].includes(type)) {
    return res.status(400).json({ error: 'Invalid report type' })
  }

  try {
    const records = await prisma.bonus.findMany({
      where:   { user_id: req.user.id, type },
      orderBy: { created_at: 'desc' },
      include: {
        from_user: {
          select: { user_id: true, name: true }
        }
      }
    })
    res.json({ records })
  } catch (err) { 
    console.error(`[Earnings Report Error - ${type}]:`, err.message)
    res.status(500).json({ error: `Internal server error: ${err.message}` })
  }
})

module.exports = router
