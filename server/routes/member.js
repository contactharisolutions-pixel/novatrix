const router       = require('express').Router()
const bcrypt       = require('bcryptjs')
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

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

    const [
      totalTopup, totalWithdraw, totalEarning, teamCount, activeTeamCount, todayJoiningCount, todayBusinessSum, todayActivationCount,
      totalTeamBusinessSum, todayRoiSum, totalRoiSum, todaySponsorSum, totalSponsorSum, todayLevelSum, totalLevelSum
    ] = await Promise.all([
      // Total Topup = total activated trade packages (self + admin-activated)
      prisma.tradePackage.aggregate({ where: { user_id: req.user.id }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { user_id: req.user.id, status: 'approved' }, _sum: { amount: true } }),
      prisma.bonus.aggregate({ where: { user_id: req.user.id }, _sum: { amount: true } }),
      
      // Total Team (Recursive)
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id}
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        )
        SELECT COUNT(*) as count FROM tree
      `,

      // Active Team (Recursive)
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id} AND status = 'active'
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id WHERE u.status = 'active'
        )
        SELECT COUNT(*) as count FROM tree
      `,

      // Today's Joining (Recursive) — IST timezone
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id}
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        )
        SELECT COUNT(*) as count FROM "User" 
        WHERE id IN (SELECT id FROM tree) 
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `,

      // Today's Business (Recursive Sum of Trade Packages) — IST timezone
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id}
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        )
        SELECT SUM(amount) as total FROM "TradePackage" 
        WHERE user_id IN (SELECT id FROM tree) 
        AND (started_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `,

      // Today's Activations (Users who got their FIRST package today in downline) — IST timezone
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id}
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        )
        SELECT COUNT(DISTINCT user_id) as count FROM "TradePackage"
        WHERE user_id IN (SELECT id FROM tree)
        AND (started_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        AND user_id NOT IN (
          SELECT user_id FROM "TradePackage" 
          WHERE (started_at AT TIME ZONE 'Asia/Kolkata')::date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        )
      `,

      // Total Team Business (Recursive Sum of Trade Packages)
      prisma.$queryRaw`
        WITH RECURSIVE tree AS (
          SELECT id FROM "User" WHERE sponsor_id = ${req.user.id}
          UNION ALL
          SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        )
        SELECT SUM(amount) as total FROM "TradePackage" 
        WHERE user_id IN (SELECT id FROM tree)
      `,

      // Today's ROI
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'trading'::"BonusType"
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `,

      // Total ROI
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'trading'::"BonusType"
      `,

      // Today's Sponsor Income
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'direct'::"BonusType"
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `,

      // Total Sponsor Income
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'direct'::"BonusType"
      `,

      // Today's Level Income
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'level'::"BonusType"
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `,

      // Total Level Income
      prisma.$queryRaw`
        SELECT SUM(amount) as total FROM "Bonus"
        WHERE user_id = ${req.user.id} AND type = 'level'::"BonusType"
      `
    ])

    res.json({
      user,
      stats: {
        fund_wallet:    user.fund_wallet_balance,
        income_wallet:  user.income_wallet_balance,
        total_topup:    totalTopup._sum.amount       || 0,
        total_withdraw: totalWithdraw._sum.amount     || 0,
        total_earning:  totalEarning._sum.amount     || 0,
        team_total:     Number(teamCount[0]?.count   || 0),
        active_team:    Number(activeTeamCount[0]?.count || 0),
        today_joining:  Number(todayJoiningCount[0]?.count || 0),
        today_business: Number(todayBusinessSum[0]?.total || 0),
        today_activation: Number(todayActivationCount[0]?.count || 0),
        total_team_business: Number(totalTeamBusinessSum[0]?.total || 0),
        today_roi: Number(todayRoiSum[0]?.total || 0),
        total_roi: Number(totalRoiSum[0]?.total || 0),
        today_sponsor_income: Number(todaySponsorSum[0]?.total || 0),
        total_sponsor_income: Number(totalSponsorSum[0]?.total || 0),
        today_level_income: Number(todayLevelSum[0]?.total || 0),
        total_level_income: Number(totalLevelSum[0]?.total || 0),
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
