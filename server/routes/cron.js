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

// ─── POST /api/cron/queue-roi ──────────────────────────────────
// Called daily to enqueue individual package ROI payouts in QStash
router.post('/queue-roi', verifyCronSecret, async (req, res) => {
  const startTime = Date.now()
  try {
    const qstashToken = process.env.QSTASH_TOKEN
    const appUrl      = process.env.APP_URL
    const cronSecret  = process.env.CRON_SECRET
    const qstashUrl   = process.env.QSTASH_URL || 'https://qstash.upstash.io'

    if (!qstashToken) {
      return res.status(500).json({ success: false, error: 'QSTASH_TOKEN not configured' })
    }
    if (!appUrl) {
      return res.status(500).json({ success: false, error: 'APP_URL not configured' })
    }

    const now  = new Date()
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const istNow  = new Date(now.getTime() + IST_OFFSET_MS)
    const day  = istNow.getUTCDay() // 0=Sun, 6=Sat

    // Daily ROI runs Monday to Friday only (day 1-5 in IST)
    if (day < 1 || day > 5) {
      console.log(`[QueueRoi] Skipping weekend queue (day ${day})`)
      return res.json({ success: true, message: 'Skipped (weekend)', queued: 0 })
    }

    // Fetch active packages
    const prisma = require('../lib/prisma')
    const activePackages = await prisma.tradePackage.findMany({
      where: { status: 'active' },
      select: { id: true }
    })

    const total = activePackages.length
    console.log(`[QueueRoi] Enqueueing ${total} active package(s) via QStash...`)

    // Publish to QStash for each package
    const promises = activePackages.map(pkg => {
      const targetUrl = `${appUrl}/api/cron/process-package`
      return fetch(`${qstashUrl}/v2/publish/${targetUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
          'Content-Type': 'application/json',
          'Upstash-Forward-Authorization': `Bearer ${cronSecret}`
        },
        body: JSON.stringify({ packageId: pkg.id })
      }).then(async r => {
        if (!r.ok) {
          const text = await r.text()
          throw new Error(`QStash error for package #${pkg.id}: ${text}`)
        }
        return r.json()
      })
    })

    const results = await Promise.allSettled(promises)
    const fulfilled = results.filter(r => r.status === 'fulfilled').length
    const rejected = results.filter(r => r.status === 'rejected').length

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`[QueueRoi] Finished enqueuing. Success: ${fulfilled}, Failed: ${rejected}, Time: ${duration}s`)

    res.json({
      success: true,
      duration: `${duration}s`,
      total,
      success_count: fulfilled,
      failed_count: rejected,
    })
  } catch (err) {
    console.error('[QueueRoi] Fatal error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /api/cron/process-package ────────────────────────────
// Processes ROI for a single package
router.post('/process-package', verifyCronSecret, async (req, res) => {
  const { packageId } = req.body
  if (!packageId) {
    return res.status(400).json({ success: false, error: 'Missing packageId' })
  }

  try {
    const { distributeROIForPackage } = require('../services/roiCron')
    const result = await distributeROIForPackage(Number(packageId))
    res.json(result)
  } catch (err) {
    console.error(`[ProcessPackage] Error processing package #${packageId}:`, err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET /api/cron/health ──────────────────────────────────────
// Simple health probe — no secret required — for uptime monitors
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

module.exports = router
