/**
 * Cron Trigger Route  — /api/cron/run
 *
 * WHY THIS EXISTS:
 * Vercel is serverless — there is NO persistent process. node-cron requires
 * a process that stays alive 24/7. On Vercel, the server shuts down after
 * each HTTP request, so node-cron jobs never fire.
 *
 * SOLUTION:
 * 1. This endpoint contains all the cron logic.
 * 2. Vercel's built-in Cron Jobs (or an external scheduler like cron-job.org)
 *    make an HTTP call to this endpoint at the scheduled time.
 * 3. The endpoint is protected by a CRON_SECRET so only the scheduler can call it.
 */

const router = require('express').Router()
const { distributeROI }            = require('../services/roiCron')
const { matureRewards }            = require('../services/rewardEngine')
const { distributeMonthlyRoyalty } = require('../services/royaltyEngine')

/** Secret guard — accepts three forms:
 *  1. x-cron-secret: YOUR_SECRET       (manual / external scheduler)
 *  2. ?secret=YOUR_SECRET               (query param for Hobby plan)
 *  3. Authorization: Bearer YOUR_SECRET (Vercel Pro automatic injection)
 */
function verifyCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured on server' })

  const fromHeader  = req.headers['x-cron-secret']
  const fromQuery   = req.query.secret
  const fromBearer  = req.headers['authorization']?.replace('Bearer ', '')

  if (fromHeader === secret || fromQuery === secret || fromBearer === secret) {
    return next()
  }
  return res.status(401).json({ error: 'Unauthorized — invalid cron secret' })
}


// Called daily at midnight IST by Vercel Cron or external scheduler
router.all('/run', verifyCronSecret, async (req, res) => {
  const startTime = Date.now()
  const results   = {}

  try {
    const now  = new Date()
    // Use UTC offset math to get reliable IST time on Vercel (UTC servers)
    // IST = UTC + 5:30. getDay() on UTC can return the wrong day when cron fires at 18:30 UTC
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const istNow  = new Date(now.getTime() + IST_OFFSET_MS)
    const day  = istNow.getUTCDay()   // 0=Sun, 6=Sat — now correctly in IST
    const date = istNow.getUTCDate()  // day of month in IST

    console.log(`[CronTrigger] Starting daily run — IST: ${istNow.toISOString()}, day=${day}, date=${date}`)

    // 1. Monthly Royalty Distribution (runs on the 1st of every month IST)
    if (date === 1) {
      await distributeMonthlyRoyalty()
      results.monthly_royalty = 'completed'
    } else {
      results.monthly_royalty = 'skipped (not 1st of month)'
    }

    // 2. Daily ROI — Monday to Friday only (day 1–5 in IST)
    //    All other incomes (direct, level, reward rank, royalty rank) fire
    //    immediately on activation — they are NOT run here.
    if (day >= 1 && day <= 5) {
      await distributeROI()
      results.daily_roi = 'completed'
    } else {
      results.daily_roi = 'skipped (weekend)'
    }

    // 3. Reward Maturation — every day (time-based: 30-day lock, must stay in cron)
    await matureRewards()
    results.reward_maturation = 'completed'

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`[CronTrigger] Completed in ${duration}s`, results)

    res.json({
      success:  true,
      duration: `${duration}s`,
      ran_at:   now.toISOString(),
      results,
    })
  } catch (err) {
    console.error('[CronTrigger] Fatal error:', err.message)
    res.status(500).json({ success: false, error: err.message, results })
  }
})

// ─── POST /api/cron/run-level-bonus ───────────────────────────
// One-shot: re-fires triggerROIMatchingBonus for every RoiDistribution
// record created today (IST). Useful to backfill level income when ROI
// already ran but the matching bonus was dropped (e.g. fire-and-forget bug).
router.all('/run-level-bonus', verifyCronSecret, async (req, res) => {
  const { triggerROIMatchingBonus } = require('../services/bonusEngine')
  const prisma = require('../lib/prisma')
  const startTime = Date.now()

  try {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const todayIST  = new Date(Date.now() + IST_OFFSET_MS)
    const todayStr  = todayIST.toISOString().split('T')[0]
    const dayStart  = new Date(todayStr + 'T00:00:00+05:30')

    // RoiDistribution has no 'user' relation in Prisma schema — fetch raw records
    const distributions = await prisma.roiDistribution.findMany({
      where:   { created_at: { gte: dayStart } },
      orderBy: { created_at: 'asc' },
      select:  { id: true, user_id: true, amount: true },
    })

    // Aggregate total ROI per user_id (sum multiple packages into one matching call)
    const byUser = {}
    for (const d of distributions) {
      byUser[d.user_id] = (byUser[d.user_id] || 0) + parseFloat(d.amount)
    }

    // Fetch display user_ids for logging
    const userIds = Object.keys(byUser).map(Number)
    const users   = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, user_id: true },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u.user_id]))

    console.log(`[LevelBonus Replay] Found ${distributions.length} distribution(s) for ${userIds.length} member(s) on ${todayStr}`)

    let processed = 0, errors = 0
    for (const [dbIdStr, totalRoi] of Object.entries(byUser)) {
      const dbId      = parseInt(dbIdStr)
      const displayId = userMap[dbId] || 'Member'
      try {
        await triggerROIMatchingBonus(dbId, displayId, totalRoi)
        processed++
        console.log(`[LevelBonus Replay] ✓ user ${displayId} — ROI $${totalRoi.toFixed(2)}`)
      } catch (err) {
        errors++
        console.error(`[LevelBonus Replay] ✗ user ${displayId}:`, err.message)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    res.json({
      success:   true,
      duration:  `${duration}s`,
      date:      todayStr,
      processed,
      errors,
      total:     userIds.length,
    })
  } catch (err) {
    console.error('[LevelBonus Replay] Fatal:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET /api/cron/health ──────────────────────────────────────
// Simple health probe — no secret required — for uptime monitors
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

module.exports = router
