/**
 * ============================================================
 *  ROI FULL AUDIT & BACKFILL SCRIPT
 * ============================================================
 *
 * PURPOSE:
 *   1. Audits ALL member packages (active + completed) from
 *      PLATFORM_LAUNCH (2026-05-04) to TODAY (IST).
 *   2. Identifies every weekday where an ROI distribution is
 *      missing for each package.
 *   3. Backfills the missing distributions with the correct
 *      daily ROI amount (2% / 1% / 0.5%), correct max return
 *      multiplier (2x or 3x), and correct created_at timestamp
 *      (noon IST of the missed day).
 *   4. Also triggers level-matching bonuses for each backfilled
 *      ROI entry.
 *
 * ROOT CAUSE IDENTIFIED:
 *   - The cron job runs Mon–Fri but can miss days due to
 *     Vercel serverless cold-start timeouts, deployment gaps,
 *     or the cron firing outside the 18:30 UTC window.
 *   - No systematic backfill existed — only single-date scripts.
 *   - The audit.js / check_missed.js scripts only looked at
 *     "yesterday", not all historical days.
 *
 * SAFETY:
 *   - DRY RUN mode by default (set DRY_RUN=false to execute).
 *   - Idempotent: checks RoiDistribution before crediting.
 *   - Skips packages that are already at max_return.
 *   - Skips weekends (Sat/Sun in IST).
 *
 * USAGE:
 *   # Audit only (safe):
 *   node scripts/backfill_roi.js
 *
 *   # Execute backfill:
 *   DRY_RUN=false node scripts/backfill_roi.js
 * ============================================================
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Config ──────────────────────────────────────────────────
const DRY_RUN        = process.env.DRY_RUN !== 'false' // default: true
const IST_OFFSET_MS  = 5.5 * 60 * 60 * 1000
const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30') // first ROI day

// Trading pairs for ROI records
const TRADING_PAIRS  = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'EUR/GBP', 'USD/JPY', 'GBP/USD', 'SOL/USDT']
function pickPair()  { return TRADING_PAIRS[Math.floor(Math.random() * TRADING_PAIRS.length)] }

// ─── Commission Rates (mirrors bonusEngine.js defaults) ──────
const LEVEL_RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]

// ─── Helpers ─────────────────────────────────────────────────

/** Return an array of all weekday date-strings (IST) from `from` to `to` inclusive */
function getWeekdaysBetween(fromDate, toDate) {
  const days = []
  let cur = new Date(fromDate)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(toDate)
  end.setHours(0, 0, 0, 0)

  while (cur <= end) {
    const dayOfWeek = cur.getDay() // 0=Sun, 6=Sat
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(cur.toISOString().split('T')[0])
    }
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
  }
  return days
}

/** Determine daily ROI % based on how many days after platform launch the package started */
function getDailyRoiRate(pkgStartedAt) {
  const effectiveStart = pkgStartedAt < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStartedAt
  const diffMs   = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  if (diffDays <= 30)  return 2.0
  if (diffDays <= 120) return 1.0
  return 0.5
}

/** Credit income wallet and write IncomeLedger + Bonus (within a transaction) */
async function creditIncome(tx, userId, amount, remarks, pkgId) {
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
      reference_id:   pkgId,
    },
  })
  await tx.bonus.create({
    data: { user_id: userId, type: 'trading', level: 0, amount },
  })
}

/** Trigger level matching bonus up the sponsor chain (non-transactional, mirrors bonusEngine) */
async function triggerLevelBonus(memberId, memberUserId, roiAmount) {
  let level     = 1
  let sponsorId = (await prisma.user.findUnique({ where: { id: memberId }, select: { sponsor_id: true } }))?.sponsor_id

  while (level <= 15 && sponsorId) {
    const sponsor = await prisma.user.findUnique({
      where: { id: sponsorId },
      select: {
        sponsor_id: true,
        status:     true,
        packages:   { where: { status: 'active' }, take: 1, select: { id: true } },
        _count:     { select: { referrals: { where: { packages: { some: { status: 'active' } } } } } },
      },
    })

    if (!sponsor) break

    if (sponsor.status === 'active' && sponsor.packages.length > 0) {
      if (sponsor._count.referrals >= level) {
        const rate     = LEVEL_RATES[level] || 0
        const bonusAmt = parseFloat((roiAmount * rate / 100).toFixed(2))
        if (bonusAmt > 0) {
          await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
              where: { id: sponsorId },
              data:  { income_wallet_balance: { increment: bonusAmt } },
            })
            await tx.bonus.create({
              data: {
                user_id:      sponsorId,
                from_user_id: memberId,
                type:         'level',
                level,
                amount:       bonusAmt,
              },
            })
            await tx.incomeLedger.create({
              data: {
                user_id:        sponsorId,
                type:           'credit',
                amount:         bonusAmt,
                balance_after:  updated.income_wallet_balance,
                remarks:        `[Backfill] Level ${level} ROI matching from ${memberUserId}`,
                reference_type: 'bonus',
              },
            })
          })
        }
      }
    }

    sponsorId = sponsor.sponsor_id
    level++
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(` ROI FULL AUDIT & BACKFILL — ${new Date().toISOString()}`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN (read-only)' : '🚀 LIVE EXECUTION'}`)
  console.log(`${'='.repeat(60)}\n`)

  // ── STEP 1: Get today (IST) ───────────────────────────────
  const nowIST    = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr  = nowIST.toISOString().split('T')[0]
  const todayIST  = new Date(todayStr + 'T00:00:00+05:30')

  // Yesterday IST is the last possible day ROI should have run
  const yesterday = new Date(todayIST.getTime() - 24 * 60 * 60 * 1000)
  const yestStr   = yesterday.toISOString().split('T')[0]

  console.log(`📅 Platform launch : ${PLATFORM_LAUNCH.toISOString().split('T')[0]}`)
  console.log(`📅 Today (IST)     : ${todayStr}`)
  console.log(`📅 Audit range     : ${PLATFORM_LAUNCH.toISOString().split('T')[0]} → ${yestStr}\n`)

  // ── STEP 2: Fetch ALL packages (active + completed) ───────
  const packages = await prisma.tradePackage.findMany({
    include: { user: { select: { user_id: true, id: true } } },
    orderBy: { id: 'asc' },
  })

  console.log(`📦 Total packages fetched: ${packages.length}`)
  console.log(`   Active    : ${packages.filter(p => p.status === 'active').length}`)
  console.log(`   Completed : ${packages.filter(p => p.status === 'completed').length}\n`)

  // ── STEP 3: For each package find missing ROI days ────────
  let totalMissingDays = 0
  let totalBackfilled  = 0
  let totalErrors      = 0
  const auditReport    = []

  for (const pkg of packages) {
    const pkgStart = new Date(pkg.started_at)

    // The first eligible ROI day is max(package_start, platform_launch)
    const firstEligible = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart

    // If the package started AFTER today, skip
    if (firstEligible >= todayIST) continue

    // All weekdays from firstEligible to yesterday
    const eligibleDays = getWeekdaysBetween(firstEligible, yesterday)
    if (eligibleDays.length === 0) continue

    // Fetch all ROI distributions for this package
    const distributions = await prisma.roiDistribution.findMany({
      where:   { package_id: pkg.id },
      select:  { created_at: true },
      orderBy: { created_at: 'asc' },
    })

    // Build a Set of IST date-strings that already have a distribution
    const daysWithROI = new Set(
      distributions.map(d => {
        const dtIST = new Date(d.created_at.getTime() + IST_OFFSET_MS)
        return dtIST.toISOString().split('T')[0]
      })
    )

    // Identify missing days
    const missingDays = eligibleDays.filter(d => !daysWithROI.has(d))

    if (missingDays.length === 0) continue

    totalMissingDays += missingDays.length
    console.log(`\n⚠️  Package #${pkg.id} | User ${pkg.user.user_id} | Amount $${pkg.amount} | Status: ${pkg.status}`)
    console.log(`   Started : ${pkgStart.toISOString().split('T')[0]} | Eligible days: ${eligibleDays.length} | Received: ${eligibleDays.length - missingDays.length} | Missing: ${missingDays.length}`)
    console.log(`   Missing days: ${missingDays.join(', ')}`)

    auditReport.push({
      pkg_id: pkg.id,
      user_id: pkg.user.user_id,
      amount: pkg.amount,
      status: pkg.status,
      missing_days: missingDays,
    })

    if (DRY_RUN) continue

    // ── STEP 4: Backfill each missing day ─────────────────
    // We need to recalculate total_earned as we go because each day
    // builds on the previous balance.
    let runningTotal = parseFloat(pkg.total_earned)
    const dailyRoi   = getDailyRoiRate(pkgStart)

    // Fetch max multiplier (2x or 3x based on team business)
    const [firstPkg] = await prisma.$queryRaw`
      SELECT started_at FROM "TradePackage"
      WHERE user_id = ${pkg.user_id}
      ORDER BY started_at ASC LIMIT 1
    `
    const memberActivationDate = firstPkg ? new Date(firstPkg.started_at) : pkgStart
    const limit15Days          = new Date(memberActivationDate.getTime() + 15 * 24 * 60 * 60 * 1000)

    const [memberInvestRes] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id = ${pkg.user_id} AND started_at <= ${limit15Days}
    `
    const [teamInvestRes] = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE sponsor_id = ${pkg.user_id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${limit15Days}
    `
    const memberInvest15 = parseFloat(memberInvestRes?.total || 0)
    const teamInvest15   = parseFloat(teamInvestRes?.total || 0)
    const maxMultiplier  = (memberInvest15 > 0 && teamInvest15 >= 3 * memberInvest15) ? 3 : 2
    const pkgAmount      = parseFloat(pkg.amount)
    const maxReturn      = pkgAmount * maxMultiplier

    for (const dayStr of missingDays) {
      // Check AGAIN if this specific day was not written by a concurrent run
      const alreadyExists = await prisma.roiDistribution.findFirst({
        where: {
          package_id: pkg.id,
          created_at: {
            gte: new Date(dayStr + 'T00:00:00+05:30'),
            lt:  new Date(dayStr + 'T23:59:59+05:30'),
          },
        },
      })
      if (alreadyExists) {
        console.log(`   ↳ [SKIP] ${dayStr} — distribution already exists (concurrent write?)`)
        continue
      }

      const roiEarned  = parseFloat((pkgAmount * dailyRoi / 100).toFixed(2))
      const creditable = Math.min(roiEarned, maxReturn - runningTotal)

      if (creditable <= 0) {
        console.log(`   ↳ [SKIP] ${dayStr} — already at max return ($${runningTotal.toFixed(2)} / $${maxReturn.toFixed(2)})`)
        break
      }

      const newTotal = runningTotal + creditable
      const isDone   = newTotal >= maxReturn
      // Set created_at to noon IST of the missed day
      const createdAt = new Date(dayStr + 'T12:00:00+05:30')

      try {
        await prisma.$transaction(async (tx) => {
          await tx.tradePackage.update({
            where: { id: pkg.id },
            data: {
              total_earned:      newTotal,
              max_return:        maxReturn,
              daily_roi_percent: dailyRoi,
              status:            isDone ? 'completed' : 'active',
              completed_at:      isDone ? createdAt    : null,
            },
          })
          await creditIncome(
            tx,
            pkg.user_id,
            creditable,
            `[Backfill] Daily ROI ${dailyRoi}% on package #${pkg.id} for ${dayStr}`,
            pkg.id
          )
          await tx.roiDistribution.create({
            data: {
              package_id: pkg.id,
              user_id:    pkg.user_id,
              amount:     creditable,
              pair_name:  pickPair(),
              created_at: createdAt,
            },
          })
        })

        runningTotal = newTotal
        totalBackfilled++
        console.log(`   ✅ ${dayStr} — credited $${creditable.toFixed(2)} (total: $${newTotal.toFixed(2)} / $${maxReturn.toFixed(2)})${isDone ? ' — COMPLETED' : ''}`)

        // Trigger level matching bonus for this backfill
        try {
          await triggerLevelBonus(pkg.user_id, pkg.user.user_id, creditable)
        } catch (lvlErr) {
          console.error(`   ⚠️  Level bonus error for ${dayStr}:`, lvlErr.message)
        }

        if (isDone) {
          console.log(`   🏁 Package #${pkg.id} reached max return. Stopping further backfill.`)
          break
        }
      } catch (err) {
        totalErrors++
        console.error(`   ❌ Error backfilling ${dayStr} for pkg #${pkg.id}:`, err.message)
      }
    }
  }

  // ── STEP 5: Summary ───────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`)
  console.log(` AUDIT SUMMARY`)
  console.log(`${'='.repeat(60)}`)
  console.log(` Packages with missing ROI : ${auditReport.length}`)
  console.log(` Total missing day-entries : ${totalMissingDays}`)

  if (!DRY_RUN) {
    console.log(` Backfilled entries        : ${totalBackfilled}`)
    console.log(` Errors                    : ${totalErrors}`)
  } else {
    console.log(`\n ℹ️  DRY RUN — no data was written.`)
    console.log(` Re-run with DRY_RUN=false to execute the backfill.`)
  }

  if (auditReport.length > 0) {
    console.log(`\n Affected members:`)
    auditReport.forEach(r => {
      console.log(`  • Package #${r.pkg_id} | User ${r.user_id} | $${r.amount} | ${r.missing_days.length} missing day(s)`)
    })
  } else {
    console.log(`\n ✅ All packages are up-to-date. No missing ROI distributions found.`)
  }

  console.log(`${'='.repeat(60)}\n`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
