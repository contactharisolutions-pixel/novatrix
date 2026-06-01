const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
const { getRoiEligibility } = require('../services/businessUtils')
router.use(authenticate)

// Helper function: Calculate ROI eligibility in-memory
function getRoiEligibilityInMemory(userPackages, downlinePackages) {
  if (!userPackages || userPackages.length === 0) {
    return {
      status: 'pending_activation',
      multiplier: 2,
      activation_date: null,
      limit_date: null,
      days_remaining: 15,
      member_investment_15_days: 0,
      team_investment_15_days: 0,
      target_team_investment: 0,
      progress_percent: 0
    }
  }

  const activation_date = userPackages[0].started_at
  const limit_date = new Date(new Date(activation_date).getTime() + 15 * 24 * 60 * 60 * 1000)

  let member_investment_15_days = 0
  for (const pkg of userPackages) {
    if (new Date(pkg.started_at) <= limit_date) {
      member_investment_15_days += parseFloat(pkg.amount || 0)
    }
  }

  let team_investment_15_days = 0
  for (const pkg of downlinePackages) {
    if (new Date(pkg.started_at) <= limit_date) {
      team_investment_15_days += parseFloat(pkg.amount || 0)
    }
  }

  if (member_investment_15_days === 0) {
    return {
      status: 'pending_activation',
      multiplier: 2,
      activation_date,
      limit_date,
      days_remaining: 15,
      member_investment_15_days: 0,
      team_investment_15_days: 0,
      target_team_investment: 0,
      progress_percent: 0
    }
  }

  const target_team_investment = 3 * member_investment_15_days
  const is_eligible_3x = team_investment_15_days >= target_team_investment
  const now = new Date()
  const is_window_active = now <= limit_date

  let days_remaining = 0
  if (is_window_active) {
    const time_diff = limit_date.getTime() - now.getTime()
    days_remaining = Math.max(0, Math.ceil(time_diff / (1000 * 60 * 60 * 24)))
  }

  let status = 'eligible_2x'
  let multiplier = 2
  if (is_eligible_3x) {
    status = 'eligible_3x'
    multiplier = 3
  } else if (is_window_active) {
    status = 'pending'
    multiplier = 2
  }

  const progress_percent = target_team_investment > 0
    ? Math.min(100, Math.round((team_investment_15_days / target_team_investment) * 100))
    : 0

  return {
    status,
    multiplier,
    activation_date,
    limit_date,
    days_remaining,
    member_investment_15_days,
    team_investment_15_days,
    target_team_investment,
    progress_percent
  }
}

// ─── GET /api/member/dashboard ─────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        user_id:               true,
        name:                  true,
        status:                true,
        referral_code:         true,
        fund_wallet_balance:   true,
        income_wallet_balance: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const getKolkataDateString = (date) => {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
    }
    const todayStr = getKolkataDateString(new Date())

    // 1. Fetch user's recursive downline user IDs & statuses in one single tree traversal
    const downline = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, status, created_at FROM "User" WHERE sponsor_id = ${req.user.id}
        UNION ALL
        SELECT u.id, u.status, u.created_at FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT id, status, created_at FROM tree
    `

    const team_total = downline.length
    const active_team = downline.filter(u => u.status === 'active').length
    
    let today_joining = 0
    let today_deactivate_joining = 0
    for (const u of downline) {
      if (getKolkataDateString(new Date(u.created_at)) === todayStr) {
        today_joining++
        if (u.status === 'inactive') {
          today_deactivate_joining++
        }
      }
    }

    const downlineIds = downline.map(u => u.id)

    // 2. Fetch downline trade packages, user's own trade packages, aggregates & bonus groupings in parallel
    let today_business = 0
    let total_team_business = 0
    let today_activation = 0
    let downlinePackages = []

    const [packages, userPackages, totalTopup, totalWithdraw, bonusSums] = await Promise.all([
      downlineIds.length > 0
        ? prisma.tradePackage.findMany({
            where: { user_id: { in: downlineIds } },
            select: { amount: true, started_at: true, user_id: true }
          })
        : Promise.resolve([]),
      prisma.tradePackage.findMany({
        where: { user_id: req.user.id },
        orderBy: { started_at: 'asc' }
      }),
      prisma.tradePackage.aggregate({ where: { user_id: req.user.id }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { user_id: req.user.id, status: 'approved' }, _sum: { amount: true } }),
      prisma.$queryRaw`
        SELECT 
          type,
          SUM(amount)::float as total,
          SUM(CASE WHEN ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN amount ELSE 0 END)::float as today
        FROM "Bonus"
        WHERE user_id = ${req.user.id}
        GROUP BY type
      `
    ])

    downlinePackages = packages

    // Calculate in-memory downline stats
    const firstPkgTimeByUser = {}

    for (const pkg of downlinePackages) {
      const amt = parseFloat(pkg.amount || 0)
      total_team_business += amt
      
      const pkgTime = new Date(pkg.started_at).getTime()
      const pkgDateStr = getKolkataDateString(new Date(pkg.started_at))
      if (pkgDateStr === todayStr) {
        today_business += amt
      }

      // Track first activation time
      if (!firstPkgTimeByUser[pkg.user_id] || pkgTime < firstPkgTimeByUser[pkg.user_id]) {
        firstPkgTimeByUser[pkg.user_id] = pkgTime
      }
    }

    // Check how many downline users had their first activation today
    for (const userId in firstPkgTimeByUser) {
      const firstDateStr = getKolkataDateString(new Date(firstPkgTimeByUser[userId]))
      if (firstDateStr === todayStr) {
        today_activation++
      }
    }

    // Calculate in-memory ROI eligibility
    const roiEligibility = getRoiEligibilityInMemory(userPackages, downlinePackages)

    // Process bonus aggregates in-memory
    let totalEarning = 0
    let today_roi = 0
    let total_roi = 0
    let today_sponsor_income = 0
    let total_sponsor_income = 0
    let today_level_income = 0
    let total_level_income = 0

    for (const row of bonusSums) {
      const rowTotal = parseFloat(row.total || 0)
      const rowToday = parseFloat(row.today || 0)
      totalEarning += rowTotal

      if (row.type === 'trading') {
        today_roi = rowToday
        total_roi = rowTotal
      } else if (row.type === 'direct') {
        today_sponsor_income = rowToday
        total_sponsor_income = rowTotal
      } else if (row.type === 'level') {
        today_level_income = rowToday
        total_level_income = rowTotal
      }
    }

    res.json({
      user,
      stats: {
        fund_wallet:             user.fund_wallet_balance,
        income_wallet:           user.income_wallet_balance,
        total_topup:             totalTopup._sum.amount       || 0,
        total_withdraw:          totalWithdraw._sum.amount     || 0,
        total_earning:           totalEarning,
        team_total,
        active_team,
        today_joining,
        today_business,
        today_activation,
        total_team_business,
        today_roi,
        total_roi,
        today_sponsor_income,
        total_sponsor_income,
        today_level_income,
        total_level_income,
        today_deactivate_joining,
        roi_eligibility:         roiEligibility
      },
    })
  } catch (err) { next(err) }
})

// ─── GET /api/member/profile ───────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        user_id:       true,
        name:          true,
        email:         true,
        phone:         true,
        status:        true,
        referral_code: true,
        bep20_wallet:  true,
        created_at:    true,
        sponsor:       { select: { user_id: true, name: true } },
      },
    })
    res.json(user)
  } catch (err) { next(err) }
})

// ─── PUT /api/member/profile ───────────────────────────────────
router.put('/profile', async (req, res, next) => {
  const { name, phone } = req.body
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data:  { name, phone },
      select: { user_id: true, name: true, phone: true },
    })
    res.json({ message: 'Profile updated', user: updated })
  } catch (err) { next(err) }
})

// ─── PUT /api/member/change-password ──────────────────────────
router.put('/change-password', async (req, res, next) => {
  const { current_password, new_password } = req.body
  try {
    const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    const hash = await bcrypt.hash(new_password, 12)
    await prisma.user.update({ where: { id: req.user.id }, data: { password_hash: hash } })
    res.json({ message: 'Password updated successfully' })
  } catch (err) { next(err) }
})

// ─── PUT /api/member/transaction-pin ──────────────────────────
router.put('/transaction-pin', async (req, res, next) => {
  const { new_pin } = req.body
  if (!new_pin || new_pin.length !== 6 || !/^\d+$/.test(new_pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits' })
  }
  try {
    const hash = await bcrypt.hash(new_pin, 12)
    await prisma.user.update({ where: { id: req.user.id }, data: { transaction_pin_hash: hash } })
    res.json({ message: 'Transaction PIN set successfully' })
  } catch (err) { next(err) }
})

// ─── PUT /api/member/wallet-address ───────────────────────────
router.put('/wallet-address', async (req, res, next) => {
  const { bep20_wallet, pin } = req.body
  if (!bep20_wallet || bep20_wallet.length < 20) return res.status(400).json({ error: 'Invalid wallet address' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    
    if (user.transaction_pin_hash) {
      const valid = await bcrypt.compare(pin, user.transaction_pin_hash)
      if (!valid) return res.status(401).json({ error: 'Invalid transaction PIN' })
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { bep20_wallet } })
    res.json({ message: 'Wallet address updated' })
  } catch (err) { next(err) }
})

const { getLegBusiness } = require('../services/businessUtils')

// Performance Ranks (Sync with RewardEngine.js)
const REWARD_RANKS = [
  { id: 1,  name: 'Pearl',                  target: 2500,       reward: 100 },
  { id: 2,  name: 'Sapphire',               target: 5000,       reward: 250 },
  { id: 3,  name: 'Ruby',                   target: 10000,      reward: 500 },
  { id: 4,  name: 'Emerald',                target: 25000,      reward: 1000 },
  { id: 5,  name: 'Platinum',               target: 50000,      reward: 2500 },
  { id: 6,  name: 'Royal Platinum',         target: 100000,     reward: 5000 },
  { id: 7,  name: 'Diamond',                target: 250000,     reward: 10000 },
  { id: 8,  name: 'Blue Diamond',           target: 500000,     reward: 25000 },
  { id: 9,  name: 'Green Diamond',          target: 1000000,    reward: 50000 },
  { id: 10, name: 'Crown Diamond',          target: 2500000,    reward: 100000 },
  { id: 11, name: 'Queen',                  target: 5000000,    reward: 250000 },
  { id: 12, name: 'Global Vice President',  target: 10000000,   reward: 500000 },
  { id: 13, name: 'King',                   target: 25000000,   reward: 1000000 },
  { id: 14, name: 'Global Trader',          target: 50000000,   reward: 2500000 },
  { id: 15, name: 'Market Maker',           target: 100000000,  reward: 5000000 }
]

const ROYALTY_RANKS = [
  { id: 1, name: 'Executive',        target: 500000,   percent: 1 },
  { id: 2, name: 'Senior Executive', target: 1000000,  percent: 2 },
  { id: 3, name: 'Vice President',   target: 2500000,  percent: 3 },
  { id: 4, name: 'CEO',              target: 5000000,  percent: 4 },
  { id: 5, name: 'Chairman',         target: 10000000, percent: 5 }
]

// ─── GET /api/member/performance ────────────────────────────────
router.get('/performance', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { rank: true, rank_id: true, royalty_rank: true, royalty_rank_id: true }
    })

    const { leg1, leg2, leg3 } = await getLegBusiness(req.user.id)
    
    // Calculate current achievement status for reward ranks
    const reward_progress = REWARD_RANKS.map(r => {
      const T = r.target
      // Rule: 40%-30%-30%
      const achieved = (leg1 >= 0.4 * T && leg2 >= 0.3 * T && leg3 >= 0.3 * T)
      return { ...r, achieved }
    })

    const royalty_progress = ROYALTY_RANKS.map(r => {
      const T = r.target
      const achieved = (leg1 >= 0.4 * T && leg2 >= 0.3 * T && leg3 >= 0.3 * T)
      return { ...r, achieved }
    })

    res.json({
      current_rank: user.rank,
      current_rank_id: user.rank_id,
      current_royalty: user.royalty_rank,
      current_royalty_id: user.royalty_rank_id,
      legs: { leg1, leg2, leg3, total: leg1 + leg2 + leg3 },
      reward_progress,
      royalty_progress
    })
  } catch (err) { next(err) }
})

// ─── GET /api/member/search ───────────────────────────────────
router.get('/search', async (req, res, next) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId query required' })
  try {
    const target = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { name: true, id: true }
    })
    if (!target || target.id === req.user.id) {
      return res.status(404).json({ error: 'User not found or invalid' })
    }
    res.json({ name: target.name })
  } catch (err) { next(err) }
})

module.exports = router
