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
const { processRewards, matureRewards } = require('../services/rewardEngine')
const { updateRoyaltyRanks, distributeMonthlyRoyalty } = require('../services/royaltyEngine')

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


// ─── POST /api/cron/run ────────────────────────────────────────
// Called daily at midnight IST by Vercel Cron or external scheduler
router.post('/run', verifyCronSecret, async (req, res) => {
  const startTime = Date.now()
  const results   = {}

  try {
    const now  = new Date()
    const day  = now.getDay()   // 0=Sun, 6=Sat
    const date = now.getDate()  // day of month (1-31)

    console.log(`[CronTrigger] Starting daily run — ${now.toISOString()}`)

    // 1. Monthly Royalty Distribution (runs on the 1st of every month)
    if (date === 1) {
      await distributeMonthlyRoyalty()
      results.monthly_royalty = 'completed'
    } else {
      results.monthly_royalty = 'skipped (not 1st of month)'
    }

    // 2. Daily ROI — Monday to Friday only (day 1–5)
    if (day >= 1 && day <= 5) {
      await distributeROI()
      results.daily_roi = 'completed'
    } else {
      results.daily_roi = 'skipped (weekend)'
    }

    // 3. Performance Rewards, Royalty Rank Updates, Reward Maturation — every day
    await processRewards()
    results.performance_rewards = 'completed'

    await updateRoyaltyRanks()
    results.royalty_ranks = 'completed'

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

// ─── GET /api/cron/health ──────────────────────────────────────
// Simple health probe — no secret required — for uptime monitors
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

module.exports = router
