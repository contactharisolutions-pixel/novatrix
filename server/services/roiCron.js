/**
 * ROI Cron Job
 * Runs daily at midnight UTC via node-cron.
 * For each active TradePackage: calculates daily ROI, credits Income Wallet,
 * and marks package as 'completed' when max_return (2×) is reached.
 */

const cron   = require('node-cron')
const prisma = require('../lib/prisma')
const { triggerROIMatchingBonus } = require('./bonusEngine')

/** Credit income wallet and write ledger entry */
async function creditIncome(tx, userId, amount, remarks, refId) {
  const user = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  })
  await tx.incomeLedger.create({
    data: {
      user_id:        userId,
      type:           'credit',
      amount,
      balance_after:  user.income_wallet_balance,
      remarks,
      reference_type: 'roi',
      reference_id:   refId,
    },
  })
  await tx.bonus.create({
    data: {
      user_id: userId,
      type:    'trading',
      level:   0,
      amount,
    },
  })
}

/** Main ROI distribution function */
async function distributeROI() {
  console.log(`[ROI Cron] Starting distribution — ${new Date().toISOString()}`)

  const activePackages = await prisma.tradePackage.findMany({
    where: { status: 'active' },
  })

  let processed = 0, completed = 0

  // FIX #8: Get today's IST date string to prevent double-fire on same day
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr = todayIST.toISOString().split('T')[0] // e.g. '2026-05-04'

  for (const pkg of activePackages) {
    // FIX #8: Skip if ROI was already distributed today for this package
    const alreadyRan = await prisma.roiDistribution.findFirst({
      where: {
        package_id: pkg.id,
        created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
      }
    })
    if (alreadyRan) {
      console.log(`[ROI Cron] Package #${pkg.id} already distributed today. Skipping.`)
      continue
    }
    const amount      = parseFloat(pkg.amount)
    const totalEarned = parseFloat(pkg.total_earned)
    const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')
    const pkgStart        = new Date(pkg.started_at)
    
    // For packages bought before launch, their activation is effectively on launch day
    const effectiveStart  = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart
    
    const diffTime = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
    // Diff in days relative to platform launch
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    // Determine daily ROI rate by package activation date
    let dailyRoi = 0.5
    if (diffDays <= 30) {
      dailyRoi = 2.0
    } else if (diffDays <= 120) { // next 90 days (30 + 90)
      dailyRoi = 1.0
    } else { // after 120 days
      dailyRoi = 0.5
    }

    // Get member's first activation date to calculate their 15-day window
    const [firstPkg] = await prisma.$queryRaw`
      SELECT started_at FROM "TradePackage"
      WHERE user_id = ${pkg.user_id}
      ORDER BY started_at ASC LIMIT 1
    `
    const memberActivationDate = firstPkg ? new Date(firstPkg.started_at) : pkgStart
    const limit15Days = new Date(memberActivationDate.getTime() + 15 * 24 * 60 * 60 * 1000)

    // Member's total investment up to 15 days from their activation date
    const [memberInvestRes] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id = ${pkg.user_id} AND started_at <= ${limit15Days}
    `
    const memberInvest15Days = parseFloat(memberInvestRes?.total || 0)

    // Downline total business up to 15 days from member's activation date
    const [teamInvestRes15Days] = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE sponsor_id = ${pkg.user_id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${limit15Days}
    `
    const teamTotal15Days = parseFloat(teamInvestRes15Days?.total || 0)

    let maxMultiplier = 2
    if (memberInvest15Days > 0 && teamTotal15Days >= 3 * memberInvest15Days) {
      maxMultiplier = 3
    }

    const maxReturn = amount * maxMultiplier

    const roiEarned = parseFloat((amount * dailyRoi / 100).toFixed(2))

    // Cap at maxReturn limit
    const creditable = Math.min(roiEarned, maxReturn - totalEarned)
    if (creditable <= 0) {
      // If already reached max via other bonuses, mark completed
      if (totalEarned >= maxReturn) {
        await prisma.tradePackage.update({
          where: { id: pkg.id },
          data: { status: 'completed', completed_at: new Date(), max_return: maxReturn, daily_roi_percent: dailyRoi },
        })
      }
      continue
    }

    const newTotal  = totalEarned + creditable
    const isDone    = newTotal >= maxReturn

    try {
      await prisma.$transaction(async (tx) => {
        await tx.tradePackage.update({
          where: { id: pkg.id },
          data: {
            total_earned:      newTotal,
            max_return:        maxReturn,
            daily_roi_percent: dailyRoi, // FIX #4: keep stored value in sync with date-based rate
            status:            isDone ? 'completed' : 'active',
            completed_at:      isDone ? new Date() : null,
          },
        })
        await creditIncome(
          tx,
          pkg.user_id,
          creditable,
          `Daily ROI ${dailyRoi}% on package #${pkg.id}`,
          pkg.id
        )
        await tx.roiDistribution.create({
          data: {
            package_id: pkg.id,
            user_id:    pkg.user_id,
            amount:     creditable,
            pair_name:  pickTradingPair(),
          },
        })
      })

      // Run matching bonus OUTSIDE the main transaction (avoids long lock) but AWAITED so
      // it fully completes before the cron response is sent. On Vercel serverless, any
      // un-awaited Promise is killed the moment the HTTP response is flushed — which is why
      // a fire-and-forget .catch() pattern silently drops all level bonuses.
      const userObj = await prisma.user.findUnique({ where: { id: pkg.user_id }, select: { user_id: true } })
      try {
        await triggerROIMatchingBonus(pkg.user_id, userObj?.user_id || 'Member', creditable)
      } catch (matchErr) {
        console.error(`[ROI Cron] Matching bonus error for package #${pkg.id}:`, matchErr.message)
      }

      processed++
      if (isDone) completed++
    } catch (err) {
      console.error(`[ROI Cron] Error for package #${pkg.id}:`, err.message)
    }
  }

  console.log(`[ROI Cron] Done. Processed: ${processed}, Completed: ${completed}`)
}

/** Simulate a trading pair for daily reports */
function pickTradingPair() {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'EUR/GBP', 'USD/JPY', 'GBP/USD', 'SOL/USDT']
  return pairs[Math.floor(Math.random() * pairs.length)]
}

const { processRewards, matureRewards } = require('./rewardEngine')
const { updateRoyaltyRanks, distributeMonthlyRoyalty } = require('./royaltyEngine')

/** Schedule: every day at 12:00 AM IST (only on persistent servers) */
function startROICron() {
  // On Vercel (serverless), node-cron does nothing — the process dies after each request.
  // The daily job is triggered instead via HTTP POST /api/cron/run by Vercel Cron Jobs.
  // Only activate the in-process scheduler when running on a persistent server (local dev / VPS).
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log('[ROI Cron] Running on Vercel — in-process cron DISABLED. Using Vercel Cron Jobs via /api/cron/run')
    return
  }

  cron.schedule('0 0 * * *', async () => {
    const today = new Date()
    const day   = today.getDay()
    const date  = today.getDate()

    if (date === 1) await distributeMonthlyRoyalty()
    if (day >= 1 && day <= 5) await distributeROI()
    await processRewards()
    await updateRoyaltyRanks()
    await matureRewards()
  }, { timezone: 'Asia/Kolkata' })

  console.log('[ROI/Reward/Royalty Cron] Scheduled — runs daily at 12:00 AM IST')
}

module.exports = { startROICron, distributeROI }
