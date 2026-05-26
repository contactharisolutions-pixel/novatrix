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

  // FIX #8: Get today's IST date string to prevent double-fire on same day
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr = todayIST.toISOString().split('T')[0] // e.g. '2026-05-04'

  // Query 1: Fetch today's ROI distributions to prevent double-runs
  const todayDists = await prisma.roiDistribution.findMany({
    where: {
      created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
    },
    select: { package_id: true }
  })
  const alreadyRanPkgIds = new Set(todayDists.map(d => d.package_id))

  // Query 2: Fetch all users and their metadata for in-memory traversal
  const users = await prisma.user.findMany({
    select: {
      id: true,
      user_id: true,
      sponsor_id: true,
      status: true,
      packages: {
        where: { status: 'active', started_at: { lte: new Date() } },
        take: 1,
        select: { id: true }
      },
      referrals: {
        select: {
          id: true,
          packages: {
            where: { status: 'active', started_at: { lte: new Date() } },
            take: 1,
            select: { id: true }
          }
        }
      }
    }
  })

  // Build the maps for sponsor walking and lookup
  const userMap = new Map()
  const childrenMap = new Map()
  const userDisplayIdMap = new Map()
  for (const u of users) {
    const hasActivePkg = u.packages.length > 0
    const activeDownlineCount = u.referrals.filter(ref => ref.packages.length > 0).length
    userMap.set(u.id, {
      sponsor_id: u.sponsor_id,
      status: u.status,
      hasActivePkg,
      activeDownlineCount
    })
    userDisplayIdMap.set(u.id, u.user_id)
    if (u.sponsor_id) {
      if (!childrenMap.has(u.sponsor_id)) {
        childrenMap.set(u.sponsor_id, [])
      }
      childrenMap.get(u.sponsor_id).push(u.id)
    }
  }

  // Query 3: Fetch all active trade packages to process (exclude blocked users)
  const activePackages = await prisma.tradePackage.findMany({
    where: {
      status: 'active',
      user: { status: { not: 'blocked' } }
    },
  })

  // Query 4: Fetch all trade packages in the database to calculate activation and volumes in memory
  const allPackages = await prisma.tradePackage.findMany({
    select: {
      id: true,
      user_id: true,
      amount: true,
      started_at: true
    }
  })

  // Group all packages by user_id
  const userPackagesMap = new Map()
  for (const pkg of allPackages) {
    if (!userPackagesMap.has(pkg.user_id)) {
      userPackagesMap.set(pkg.user_id, [])
    }
    userPackagesMap.get(pkg.user_id).push(pkg)
  }

  // Sort packages for each user by started_at ASC to easily find earliest package
  for (const [userId, pkgs] of userPackagesMap.entries()) {
    pkgs.sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
  }

  // Helper to traverse downline recursively in memory
  function getDownlineIds(userId) {
    const ids = []
    const queue = [userId]
    let current
    while (queue.length > 0) {
      current = queue.shift()
      const children = childrenMap.get(current) || []
      for (const childId of children) {
        ids.push(childId)
        queue.push(childId)
      }
    }
    return ids
  }

  let processed = 0, completed = 0

  for (const pkg of activePackages) {
    // Skip if ROI was already distributed today for this package
    if (alreadyRanPkgIds.has(pkg.id)) {
      console.log(`[ROI Cron] Package #${pkg.id} already distributed today. Skipping.`)
      continue
    }

    const amount      = parseFloat(pkg.amount)
    const totalEarned = parseFloat(pkg.total_earned)
    const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')
    const pkgStart        = new Date(pkg.started_at)
    
    const effectiveStart  = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart
    
    const diffTime = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    let dailyRoi = 0.5
    if (diffDays <= 30) {
      dailyRoi = 2.0
    } else if (diffDays <= 120) {
      dailyRoi = 1.0
    } else {
      dailyRoi = 0.5
    }

    // Get earliest package in memory
    const userPkgs = userPackagesMap.get(pkg.user_id)
    const firstPkg = userPkgs && userPkgs.length > 0 ? userPkgs[0] : null
    const memberActivationDate = firstPkg ? new Date(firstPkg.started_at) : pkgStart
    const limit15Days = new Date(memberActivationDate.getTime() + 15 * 24 * 60 * 60 * 1000)

    // Calculate member total investment in 15 days in memory
    const memberInvest15Days = userPkgs
      ? userPkgs
          .filter(p => new Date(p.started_at) <= limit15Days)
          .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      : 0

    // Calculate team total investment in 15 days in memory
    const downlineIds = getDownlineIds(pkg.user_id)
    let teamTotal15Days = 0
    for (const downlineId of downlineIds) {
      const dlPkgs = userPackagesMap.get(downlineId) || []
      for (const p of dlPkgs) {
        if (new Date(p.started_at) <= limit15Days) {
          teamTotal15Days += parseFloat(p.amount)
        }
      }
    }

    let maxMultiplier = 2
    if (memberInvest15Days > 0 && teamTotal15Days >= 3 * memberInvest15Days) {
      maxMultiplier = 3
    }

    const maxReturn = amount * maxMultiplier
    const roiEarned = parseFloat((amount * dailyRoi / 100).toFixed(2))

    const creditable = Math.min(roiEarned, maxReturn - totalEarned)
    if (creditable <= 0) {
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
            daily_roi_percent: dailyRoi,
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

      // Run matching bonus sequentially to avoid connection pool congestion
      try {
        await triggerROIMatchingBonus(
          pkg.user_id,
          userDisplayIdMap.get(pkg.user_id) || 'Member',
          creditable,
          userMap,
          new Date(),
          pkg.id
        )
      } catch (err) {
        console.error(`[ROI Cron] Matching bonus error for package #${pkg.id}:`, err.message)
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

/** Process daily ROI distribution for a single package */
async function distributeROIForPackage(packageId) {
  console.log(`[ROI Single] Processing package #${packageId} — ${new Date().toISOString()}`)

  // 1. Fetch the target package (exclude if owner is blocked)
  const pkg = await prisma.tradePackage.findFirst({
    where: {
      id: packageId,
      status: 'active',
      user: { status: { not: 'blocked' } }
    },
  })
  if (!pkg) {
    console.log(`[ROI Single] Package #${packageId} not found or not active. Skipping.`)
    return { success: false, reason: 'Package not found or inactive' }
  }

  // 2. Fetch today's IST date string to prevent double-fire
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr = todayIST.toISOString().split('T')[0]
  const dayStart = new Date(todayStr + 'T00:00:00+05:30')
  const dayEnd   = new Date(todayStr + 'T23:59:59+05:30')

  // Check if ROI was already distributed today for this package
  const todayDist = await prisma.roiDistribution.findFirst({
    where: {
      package_id: pkg.id,
      created_at: { gte: dayStart, lte: dayEnd }
    },
    select: { id: true }
  })
  if (todayDist) {
    console.log(`[ROI Single] Package #${pkg.id} already distributed today. Skipping.`)
    return { success: false, reason: 'Already distributed today' }
  }

  // 3. Query earliest package activation and total investments in 15 days
  const userPkgs = await prisma.tradePackage.findMany({
    where: { user_id: pkg.user_id },
    orderBy: { started_at: 'asc' },
    select: { amount: true, started_at: true }
  })
  const firstPkg = userPkgs.length > 0 ? userPkgs[0] : null
  const memberActivationDate = firstPkg ? new Date(firstPkg.started_at) : new Date(pkg.started_at)
  const limit15Days = new Date(memberActivationDate.getTime() + 15 * 24 * 60 * 60 * 1000)

  const memberInvest15Days = userPkgs
    .filter(p => new Date(p.started_at) <= limit15Days)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  // Query 4: Fetch downline IDs recursively using raw SQL CTE
  const downlineIdsResult = await prisma.$queryRaw`
    WITH RECURSIVE downline AS (
      SELECT id FROM "User" WHERE sponsor_id = ${pkg.user_id}
      UNION ALL
      SELECT u.id FROM "User" u
      JOIN downline d ON u.sponsor_id = d.id
    )
    SELECT id FROM downline;
  `
  const downlineIds = downlineIdsResult.map(r => r.id)

  // Query 5: Calculate team total investment in 15 days
  let teamTotal15Days = 0
  if (downlineIds.length > 0) {
    const downlinePackages = await prisma.tradePackage.findMany({
      where: {
        user_id: { in: downlineIds },
        started_at: { lte: limit15Days }
      },
      select: { amount: true }
    })
    teamTotal15Days = downlinePackages.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  }

  // 4. ROI Rate & limits logic
  const amount      = parseFloat(pkg.amount)
  const totalEarned = parseFloat(pkg.total_earned)
  const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')
  const pkgStart        = new Date(pkg.started_at)
  const effectiveStart  = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart

  const diffTime = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  let dailyRoi = 0.5
  if (diffDays <= 30) {
    dailyRoi = 2.0
  } else if (diffDays <= 120) {
    dailyRoi = 1.0
  } else {
    dailyRoi = 0.5
  }

  let maxMultiplier = 2
  if (memberInvest15Days > 0 && teamTotal15Days >= 3 * memberInvest15Days) {
    maxMultiplier = 3
  }

  const maxReturn = amount * maxMultiplier
  const roiEarned = parseFloat((amount * dailyRoi / 100).toFixed(2))

  const creditable = Math.min(roiEarned, maxReturn - totalEarned)
  if (creditable <= 0) {
    if (totalEarned >= maxReturn) {
      await prisma.tradePackage.update({
        where: { id: pkg.id },
        data: { status: 'completed', completed_at: new Date(), max_return: maxReturn, daily_roi_percent: dailyRoi },
      })
    }
    return { success: true, completed: true, roi: 0 }
  }

  const newTotal  = totalEarned + creditable
  const isDone    = newTotal >= maxReturn

  // Fetch target user display ID for remarks
  const user = await prisma.user.findUnique({
    where: { id: pkg.user_id },
    select: { user_id: true }
  })
  const userDisplayId = user?.user_id || 'Member'

  // 5. Transaction execution
  await prisma.$transaction(async (tx) => {
    await tx.tradePackage.update({
      where: { id: pkg.id },
      data: {
        total_earned:      newTotal,
        max_return:        maxReturn,
        daily_roi_percent: dailyRoi,
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

  // 6. Trigger matching bonus sequentially (running outside transaction)
  try {
    await triggerROIMatchingBonus(
      pkg.user_id,
      userDisplayId,
      creditable,
      null, // pass null to dynamically crawl sponsor chain up to 15 levels
      new Date(),
      pkg.id
    )
  } catch (err) {
    console.error(`[ROI Single] Matching bonus error for package #${pkg.id}:`, err.message)
  }

  console.log(`[ROI Single] Finished package #${pkg.id}. Credited: $${creditable}. Completed: ${isDone}`)
  return { success: true, completed: isDone, roi: creditable }
}

const { processRewards, matureRewards } = require('./rewardEngine')
const { updateRoyaltyRanks, distributeMonthlyRoyalty } = require('./royaltyEngine')

/** Run daily distribution tasks if they were missed (e.g. server was offline at midnight) */
async function runMissedCronJobs() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const istNow = new Date(Date.now() + IST_OFFSET_MS)
  const day    = istNow.getUTCDay()   // 0=Sun … 6=Sat (correctly in IST)
  const date   = istNow.getUTCDate()  // day-of-month in IST
  const todayStr = istNow.toISOString().split('T')[0]

  console.log(`[ROI Cron] Checking for missed cron runs on startup — IST: ${istNow.toISOString()}, day=${day}, date=${date}`)

  // Check if we need to distribute ROI today (Monday to Friday, day 1 to 5)
  if (day >= 1 && day <= 5) {
    const todayDistsCount = await prisma.roiDistribution.count({
      where: {
        created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
      }
    })

    if (todayDistsCount === 0) {
      console.log(`[ROI Cron] Missed daily run detected for today (${todayStr}). Distributing ROI now...`)
      await distributeROI()
    } else {
      console.log(`[ROI Cron] Daily ROI already distributed today (${todayStr}).`)
    }
  } else {
    console.log(`[ROI Cron] Skipping startup ROI check: Today is a weekend (day ${day}).`)
  }

  // Always run these daily updates on startup to ensure they are current
  console.log('[ROI Cron] Running daily updates on startup...')
  await processRewards()
  await updateRoyaltyRanks()
  await matureRewards()
}

/** Schedule: every day at 12:00 AM IST (only on persistent servers) */
function startROICron() {
  // On Vercel (serverless), node-cron does nothing — the process dies after each request.
  // The daily job is triggered instead via HTTP POST /api/cron/run by Vercel Cron Jobs.
  // Only activate the in-process scheduler when running on a persistent server (local dev / VPS).
  const isVercelCloud = process.env.VERCEL === '1'
  if (isVercelCloud) {
    console.log('[ROI Cron] Running on Vercel Cloud — in-process cron DISABLED. Using Vercel Cron Jobs via /api/cron/run')
    return
  }

  cron.schedule('0 0 * * *', async () => {
    // Use IST offset math to get reliable IST day-of-week.
    // When this fires at 00:00 IST, UTC is still 18:30 the *previous* day,
    // so `new Date().getDay()` in UTC returns the WRONG weekday.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const istNow = new Date(Date.now() + IST_OFFSET_MS)
    const day    = istNow.getUTCDay()   // 0=Sun … 6=Sat (correctly in IST)
    const date   = istNow.getUTCDate()  // day-of-month in IST

    console.log(`[ROI Cron] Firing — IST: ${istNow.toISOString()}, day=${day}, date=${date}`)

    if (date === 1) await distributeMonthlyRoyalty()
    if (day >= 1 && day <= 5) await distributeROI()
    await processRewards()
    await updateRoyaltyRanks()
    await matureRewards()
  }, { timezone: 'Asia/Kolkata' })

  console.log('[ROI/Reward/Royalty Cron] Scheduled — runs daily at 12:00 AM IST')

  // Run catch-up for missed jobs in the background on startup
  runMissedCronJobs().catch(err => {
    console.error('[ROI Cron] Error running missed cron jobs on startup:', err)
  })
}

module.exports = { startROICron, distributeROI, distributeROIForPackage }
