/**
 * ============================================================
 *  ROI FIX SCRIPT — Correct duplicate Bonus/IncomeLedger on 19/05
 *  and backfill missing 18/05/2026 ROI for all affected members
 * ============================================================
 *
 * ROOT CAUSE (confirmed by deep_roi_audit.js):
 *   - RoiDistribution table: CORRECT (1 entry per day, idempotent)
 *   - The previous backfill_roi.js run created extra Bonus(trading)
 *     and IncomeLedger entries for historical backfill dates,
 *     but these got created_at = NOW() (19/05), inflating 19/05 credits.
 *   - The 18/05/2026 (Monday) ROI was NEVER distributed — the cron
 *     missed this day and the backfill hadn't processed it yet.
 *
 * WHAT THIS SCRIPT DOES:
 *   Part A — Remove extra Bonus(trading) and IncomeLedger entries
 *             that were created on 19/05 as backfill artifacts
 *             (identified by [Backfill] prefix in remarks),
 *             and REVERSE their wallet increments.
 *
 *   Part B — Backfill the missing 18/05/2026 ROI:
 *             Create RoiDistribution, Bonus(trading), and
 *             IncomeLedger entries with created_at = noon IST 18/05.
 *
 * SAFETY:
 *   - DRY_RUN=true by default (set DRY_RUN=false to execute)
 *   - Part A uses [Backfill] remarks to identify spurious entries
 *   - Part B checks RoiDistribution before crediting (idempotent)
 *
 * USAGE:
 *   # Audit only:
 *   node scripts/fix_roi_19may.js
 *
 *   # Execute fix:
 *   DRY_RUN=false node scripts/fix_roi_19may.js
 * ============================================================
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN       = process.env.DRY_RUN !== 'false'  // default: true
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')

// Trading pairs (for new 18/05 ROI records)
const PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'EUR/GBP', 'USD/JPY', 'GBP/USD', 'SOL/USDT']
function pickPair() { return PAIRS[Math.floor(Math.random() * PAIRS.length)] }

function getDailyRoiRate(pkgStartedAt) {
  const effectiveStart = pkgStartedAt < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStartedAt
  const diffMs   = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  if (diffDays <= 30)  return 2.0
  if (diffDays <= 120) return 1.0
  return 0.5
}

function toISTTimeStr(dt) {
  return new Date(new Date(dt).getTime() + IST_OFFSET_MS).toISOString().replace('T', ' ').substring(0, 19) + ' IST'
}

// ─── Part A: Remove spurious backfill Bonus & Ledger from 19/05 ──────────────
async function removeSpuriousBackfillEntries() {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(` PART A: REMOVE SPURIOUS BACKFILL ENTRIES CREDITED ON 19/05`)
  console.log(`${'═'.repeat(70)}`)
  console.log(` These are Bonus(trading) and IncomeLedger entries created by`)
  console.log(` the backfill_roi.js run that happened today (19/05 10:05–10:11 AM).`)
  console.log(` They represent HISTORICAL days already correctly recorded in`)
  console.log(` RoiDistribution but whose wallet credits were applied twice.\n`)

  // Find all IncomeLedger entries on 19/05 with [Backfill] prefix
  const spuriousLedger = await prisma.incomeLedger.findMany({
    where: {
      reference_type: 'roi',
      remarks:        { startsWith: '[Backfill]' },
      created_at:     {
        gte: new Date('2026-05-19T00:00:00+05:30'),
        lte: new Date('2026-05-19T23:59:59+05:30'),
      },
    },
    include: {
      user: { select: { id: true, user_id: true, name: true, income_wallet_balance: true } },
    },
    orderBy: { id: 'asc' },
  })

  console.log(`Found ${spuriousLedger.length} spurious IncomeLedger entries to remove:`)

  // Group by user to sum the reversal amounts
  const reversalByUser = {}
  for (const entry of spuriousLedger) {
    const uid = entry.user_id
    if (!reversalByUser[uid]) {
      reversalByUser[uid] = { user: entry.user, total: 0, ledgerIds: [], bonuses: [] }
    }
    reversalByUser[uid].total += parseFloat(entry.amount)
    reversalByUser[uid].ledgerIds.push(entry.id)
    console.log(`  Ledger #${entry.id} | ${entry.user.user_id} (${entry.user.name}) | $${entry.amount} | ${entry.remarks}`)
  }

  // For each user, also find the matching Bonus(trading) entries on 19/05 with matching amounts
  // These are identified as Bonus entries on 19/05 that DON'T have a corresponding RoiDistribution
  // (the 07:01 AM ROI is the real one; the backfill created extras at 10:xx AM)
  console.log(`\nFinding corresponding spurious Bonus(trading) entries...`)

  // Find all bonus(trading) on 19/05 for the affected users
  const allBonuses19 = await prisma.bonus.findMany({
    where: {
      type:       'trading',
      created_at: {
        gte: new Date('2026-05-19T00:00:00+05:30'),
        lte: new Date('2026-05-19T23:59:59+05:30'),
      },
    },
    orderBy: { created_at: 'asc' },
  })

  // For each user, find the ROI distributions on 19/05 to understand
  // how many bonus entries should exist (1 per real ROI distribution)
  const packages = await prisma.tradePackage.findMany({
    where: {
      status:     { in: ['active', 'completed'] },
      started_at: { lte: new Date('2026-05-18T23:59:59+05:30') },
    },
    include: { user: { select: { id: true, user_id: true, name: true } } },
  })

  // For each user, count real ROI distributions on 19/05
  const realDistCount = {}  // user_id → count
  for (const pkg of packages) {
    const count19 = await prisma.roiDistribution.count({
      where: {
        package_id: pkg.id,
        created_at: {
          gte: new Date('2026-05-19T00:00:00+05:30'),
          lte: new Date('2026-05-19T23:59:59+05:30'),
        },
      },
    })
    if (!realDistCount[pkg.user_id]) realDistCount[pkg.user_id] = 0
    realDistCount[pkg.user_id] += count19
  }

  // For each affected user, identify which bonus entries to delete
  // (keep exactly realDistCount[uid] oldest entries, delete the rest)
  const spuriousBonusIds = []
  const bonusByUser = {}
  for (const b of allBonuses19) {
    if (!bonusByUser[b.user_id]) bonusByUser[b.user_id] = []
    bonusByUser[b.user_id].push(b)
  }

  for (const [userIdStr, bonuses] of Object.entries(bonusByUser)) {
    const uid     = parseInt(userIdStr)
    const keepCnt = realDistCount[uid] || 0
    if (bonuses.length > keepCnt) {
      // Sort oldest first, keep the first `keepCnt`, delete the rest
      bonuses.sort((a, b) => a.id - b.id)
      const toDelete = bonuses.slice(keepCnt)
      for (const b of toDelete) {
        spuriousBonusIds.push(b.id)
        if (!reversalByUser[uid]) {
          const user = packages.find(p => p.user_id === uid)?.user
          reversalByUser[uid] = { user: user || { user_id: uid, name: '?' }, total: 0, ledgerIds: [], bonuses: [] }
        }
        reversalByUser[uid].bonuses.push(b)
      }
    }
  }

  console.log(`Found ${spuriousBonusIds.length} spurious Bonus(trading) entries to remove`)

  // ── Print plan ─────────────────────────────────────────────────────────
  console.log(`\n── REVERSAL PLAN ──`)
  for (const [uid, info] of Object.entries(reversalByUser)) {
    console.log(`\n  User ${info.user.user_id} (${info.user.name}):`)
    console.log(`    Current income_wallet_balance: $${info.user?.income_wallet_balance || '?'}`)
    console.log(`    Total to DEDUCT (wallet reversal): -$${info.total.toFixed(2)}`)
    console.log(`    IncomeLedger IDs to delete: [${info.ledgerIds.join(', ')}]`)
    console.log(`    Bonus IDs to delete: [${info.bonuses.map(b => b.id).join(', ')}]`)
  }

  if (DRY_RUN) {
    console.log(`\n  ℹ️  DRY RUN — no changes made.`)
    return { reversalByUser, spuriousBonusIds }
  }

  // ── Execute reversals ──────────────────────────────────────────────────
  console.log(`\n── EXECUTING REVERSALS ──`)
  let successCount = 0
  let errorCount   = 0

  for (const [uid, info] of Object.entries(reversalByUser)) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Reverse the wallet increment
        if (info.total > 0) {
          await tx.user.update({
            where: { id: parseInt(uid) },
            data:  { income_wallet_balance: { decrement: info.total } },
          })
        }
        // 2. Delete spurious IncomeLedger entries
        if (info.ledgerIds.length > 0) {
          await tx.incomeLedger.deleteMany({
            where: { id: { in: info.ledgerIds } },
          })
        }
        // 3. Delete spurious Bonus entries
        if (info.bonuses.length > 0) {
          await tx.bonus.deleteMany({
            where: { id: { in: info.bonuses.map(b => b.id) } },
          })
        }
      })
      successCount++
      console.log(`  ✅ User ${info.user.user_id}: reversed -$${info.total.toFixed(2)}, deleted ${info.ledgerIds.length} ledger + ${info.bonuses.length} bonus entries`)
    } catch (err) {
      errorCount++
      console.error(`  ❌ User ${info.user.user_id}: ${err.message}`)
    }
  }

  console.log(`\nPart A: ${successCount} users fixed, ${errorCount} errors`)
  return { reversalByUser, spuriousBonusIds }
}

// ─── Part B: Backfill missing 18/05/2026 ROI ─────────────────────────────────
async function backfill18May() {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(` PART B: BACKFILL MISSING 18/05/2026 ROI`)
  console.log(`${'═'.repeat(70)}`)
  console.log(` 18/05/2026 (Monday) ROI was never distributed.`)
  console.log(` Crediting the correct amount with created_at = noon IST 18/05.\n`)

  const packages = await prisma.tradePackage.findMany({
    where: {
      status:     { in: ['active', 'completed'] },
      started_at: { lte: new Date('2026-05-18T23:59:59+05:30') },
    },
    include: { user: { select: { id: true, user_id: true, name: true } } },
    orderBy: { id: 'asc' },
  })

  // Target timestamp: noon IST 18/05/2026
  const NOON_18MAY = new Date('2026-05-18T12:00:00+05:30')

  let credited = 0
  let skipped  = 0
  let errors   = 0

  for (const pkg of packages) {
    // Check if 18/05 ROI already exists
    const existing = await prisma.roiDistribution.findFirst({
      where: {
        package_id: pkg.id,
        created_at: {
          gte: new Date('2026-05-18T00:00:00+05:30'),
          lte: new Date('2026-05-18T23:59:59+05:30'),
        },
      },
    })

    const pkgAmount   = parseFloat(pkg.amount)
    const dailyRoi    = getDailyRoiRate(new Date(pkg.started_at))
    const roiAmt      = parseFloat((pkgAmount * dailyRoi / 100).toFixed(2))

    if (existing) {
      console.log(`  ✓ Pkg #${pkg.id} | ${pkg.user.user_id} — 18/05 already exists, skipping.`)
      skipped++
      continue
    }

    console.log(`  → Pkg #${pkg.id} | ${pkg.user.user_id} (${pkg.user.name}) | $${pkgAmount} × ${dailyRoi}% = $${roiAmt}`)

    if (DRY_RUN) continue

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update package total_earned
        await tx.tradePackage.update({
          where: { id: pkg.id },
          data:  { total_earned: { increment: roiAmt } },
        })
        // 2. Credit income wallet
        const updated = await tx.user.update({
          where: { id: pkg.user_id },
          data:  { income_wallet_balance: { increment: roiAmt } },
        })
        // 3. IncomeLedger
        await tx.incomeLedger.create({
          data: {
            user_id:        pkg.user_id,
            type:           'credit',
            amount:         roiAmt,
            balance_after:  updated.income_wallet_balance,
            remarks:        `[Backfill] Daily ROI ${dailyRoi}% on package #${pkg.id} for 2026-05-18`,
            reference_type: 'roi',
            reference_id:   pkg.id,
            created_at:     NOON_18MAY,
          },
        })
        // 4. Bonus(trading)
        await tx.bonus.create({
          data: {
            user_id:    pkg.user_id,
            type:       'trading',
            level:      0,
            amount:     roiAmt,
            created_at: NOON_18MAY,
          },
        })
        // 5. RoiDistribution
        await tx.roiDistribution.create({
          data: {
            package_id: pkg.id,
            user_id:    pkg.user_id,
            amount:     roiAmt,
            pair_name:  pickPair(),
            created_at: NOON_18MAY,
          },
        })
      })
      credited++
      console.log(`    ✅ Credited $${roiAmt} for 18/05 to ${pkg.user.user_id}`)
    } catch (err) {
      errors++
      console.error(`    ❌ Error for pkg #${pkg.id}: ${err.message}`)
    }
  }

  console.log(`\nPart B: ${credited} packages credited, ${skipped} already had 18/05 ROI, ${errors} errors`)
  return { credited, skipped, errors }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(` ROI FIX — 18/05 & 19/05/2026 — ${new Date().toISOString()}`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN (read-only, safe)' : '🚀 LIVE EXECUTION'}`)
  console.log(`${'═'.repeat(70)}`)

  if (DRY_RUN) {
    console.log(`\n ⚠️  DRY RUN mode — no data will be changed.`)
    console.log(` Re-run with DRY_RUN=false to apply the fix.\n`)
  }

  const partA = await removeSpuriousBackfillEntries()
  const partB = await backfill18May()

  console.log(`\n${'═'.repeat(70)}`)
  console.log(` GRAND SUMMARY`)
  console.log(`${'═'.repeat(70)}`)
  console.log(` Part A — spurious entries removed  : ${Object.keys(partA.reversalByUser).length} users affected`)
  console.log(` Part B — 18/05 ROI backfilled      : ${partB.credited || '[DRY RUN]'}`)

  if (DRY_RUN) {
    console.log(`\n ℹ️  DRY RUN complete — no data was written.`)
    console.log(` Re-run with:  DRY_RUN=false node scripts/fix_roi_19may.js`)
  } else {
    console.log(`\n ✅ Fix complete. Run deep_roi_audit.js again to verify.`)
  }
  console.log(`${'═'.repeat(70)}\n`)

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
