/**
 * ============================================================
 *  ROI DATE AUDIT — Diagnose duplicate & missing entries
 * ============================================================
 *
 * Checks every member's ROI distributions around 18/05/2026
 * and 19/05/2026 (IST):
 *   - Lists how many ROI records exist per day per package
 *   - Flags packages with MULTIPLE entries on 19/05/2026 (duplicates)
 *   - Flags packages MISSING an entry for 18/05/2026
 *   - Also checks for wrong income (wrong per-day ROI amounts)
 *
 * USAGE (read-only):
 *   node scripts/audit_roi_dates.js
 * ============================================================
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const IST_OFFSET_MS   = 5.5 * 60 * 60 * 1000
const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')

function toISTDateStr(dt) {
  return new Date(new Date(dt).getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

function getDailyRoiRate(pkgStartedAt) {
  const effectiveStart = pkgStartedAt < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStartedAt
  const diffMs   = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  if (diffDays <= 30)  return 2.0
  if (diffDays <= 120) return 1.0
  return 0.5
}

async function main() {
  console.log(`\n${'='.repeat(70)}`)
  console.log(` ROI DATE AUDIT — ${new Date().toISOString()}`)
  console.log(`${'='.repeat(70)}\n`)

  // ── 1. Fetch all packages started on or before 18/05/2026 ────────────────
  const allPkgs = await prisma.tradePackage.findMany({
    where: {
      status:     { in: ['active', 'completed'] },
      started_at: { lte: new Date('2026-05-18T23:59:59+05:30') },
    },
    include: { user: { select: { id: true, user_id: true, name: true } } },
    orderBy: { id: 'asc' },
  })

  console.log(`📦 Packages started on or before 18/05/2026: ${allPkgs.length}`)

  // ── 2. For each package, check 18th and 19th distributions ──────────────
  const duplicatesOn19 = []  // packages with >1 ROI on 19/05
  const missingOn18    = []  // packages with 0 ROI on 18/05
  const wrongAmount    = []  // packages with wrong per-entry ROI amounts

  for (const pkg of allPkgs) {
    const pkgAmount   = parseFloat(pkg.amount)
    const dailyRoi    = getDailyRoiRate(new Date(pkg.started_at))
    const expectedAmt = parseFloat((pkgAmount * dailyRoi / 100).toFixed(2))

    // Fetch distributions on 18/05/2026 (IST)
    const on18 = await prisma.roiDistribution.findMany({
      where: {
        package_id: pkg.id,
        created_at: {
          gte: new Date('2026-05-18T00:00:00+05:30'),
          lte: new Date('2026-05-18T23:59:59+05:30'),
        },
      },
      orderBy: { created_at: 'asc' },
    })

    // Fetch distributions on 19/05/2026 (IST)
    const on19 = await prisma.roiDistribution.findMany({
      where: {
        package_id: pkg.id,
        created_at: {
          gte: new Date('2026-05-19T00:00:00+05:30'),
          lte: new Date('2026-05-19T23:59:59+05:30'),
        },
      },
      orderBy: { created_at: 'asc' },
    })

    if (on19.length > 1) {
      duplicatesOn19.push({ pkg, on18, on19, expectedAmt, dailyRoi })
    }
    if (on18.length === 0) {
      missingOn18.push({ pkg, on18, on19, expectedAmt, dailyRoi })
    }

    // Check if any entry's amount differs from expected
    const allEntries = [...on18, ...on19]
    for (const entry of allEntries) {
      const actual = parseFloat(entry.amount)
      if (Math.abs(actual - expectedAmt) > 0.01) {
        wrongAmount.push({
          pkg, entry, expectedAmt, actualAmt: actual, dailyRoi,
          dateStr: toISTDateStr(entry.created_at),
        })
      }
    }
  }

  // ── 3. Report duplicates on 19/05 ────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` 🔴 PACKAGES WITH DUPLICATE ROI ON 19/05/2026 (${duplicatesOn19.length})`)
  console.log(`${'─'.repeat(70)}`)

  if (duplicatesOn19.length === 0) {
    console.log('   None ✅')
  } else {
    for (const d of duplicatesOn19) {
      console.log(`\n   Package #${d.pkg.id} | User: ${d.pkg.user.user_id} (${d.pkg.user.name}) | $${d.pkg.amount} | ROI rate: ${d.dailyRoi}%`)
      console.log(`   18/05 entries: ${d.on18.length} | 19/05 entries: ${d.on19.length} ← DUPLICATE`)
      for (const r of d.on18) {
        console.log(`     [18th] ID #${r.id} | ${toISTDateStr(r.created_at)} ${r.created_at.toISOString()} | $${r.amount}`)
      }
      for (const r of d.on19) {
        console.log(`     [19th] ID #${r.id} | ${toISTDateStr(r.created_at)} ${r.created_at.toISOString()} | $${r.amount}`)
      }
    }
  }

  // ── 4. Report missing 18/05 ───────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` 🟡 PACKAGES MISSING ROI ON 18/05/2026 (${missingOn18.length})`)
  console.log(`${'─'.repeat(70)}`)

  if (missingOn18.length === 0) {
    console.log('   None ✅')
  } else {
    for (const d of missingOn18) {
      const on19Count = d.on19.length
      console.log(`   Package #${d.pkg.id} | User: ${d.pkg.user.user_id} (${d.pkg.user.name}) | $${d.pkg.amount} | 19/05 entries: ${on19Count}`)
    }
  }

  // ── 5. Report wrong ROI amounts ──────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` ⚠️  WRONG ROI AMOUNTS DETECTED ON 18/05 OR 19/05 (${wrongAmount.length})`)
  console.log(`${'─'.repeat(70)}`)

  if (wrongAmount.length === 0) {
    console.log('   None ✅')
  } else {
    for (const w of wrongAmount) {
      console.log(`\n   Dist #${w.entry.id} | Pkg #${w.pkg.id} | User: ${w.pkg.user.user_id} | Date: ${w.dateStr}`)
      console.log(`   Amount: $${w.actualAmt} | Expected ($${w.pkg.amount} × ${w.dailyRoi}%): $${w.expectedAmt}`)
      console.log(`   Diff: $${(w.actualAmt - w.expectedAmt).toFixed(2)}`)
    }
  }

  // ── 6. Check ALL distributions for wrong amount (full period) ────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` 💰 FULL ROI INCOME AUDIT (all distributions, any wrong amounts)`)
  console.log(`${'─'.repeat(70)}`)

  let fullWrongCount = 0
  for (const pkg of allPkgs) {
    const pkgAmount   = parseFloat(pkg.amount)
    const dailyRoi    = getDailyRoiRate(new Date(pkg.started_at))
    const expectedAmt = parseFloat((pkgAmount * dailyRoi / 100).toFixed(2))

    const allDists = await prisma.roiDistribution.findMany({
      where: { package_id: pkg.id },
      orderBy: { created_at: 'asc' },
    })

    for (const d of allDists) {
      const actual = parseFloat(d.amount)
      if (Math.abs(actual - expectedAmt) > 0.01) {
        fullWrongCount++
        console.log(`  ⚠️  Dist #${d.id} | Pkg #${pkg.id} | User: ${pkg.user.user_id} | ${toISTDateStr(d.created_at)}`)
        console.log(`     Actual: $${actual.toFixed(2)} | Expected: $${expectedAmt.toFixed(2)} | Rate: ${dailyRoi}% on $${pkgAmount}`)
      }
    }
  }
  if (fullWrongCount === 0) {
    console.log('  ✅ All ROI distribution amounts match expected values.')
  }

  // ── 7. Grand summary ─────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(70)}`)
  console.log(` GRAND SUMMARY`)
  console.log(`${'='.repeat(70)}`)
  console.log(` Packages checked                        : ${allPkgs.length}`)
  console.log(` Packages with duplicate ROI on 19/05    : ${duplicatesOn19.length}`)
  console.log(` Packages missing ROI on 18/05           : ${missingOn18.length}`)
  console.log(` Wrong amount distributions (18-19 May)  : ${wrongAmount.length}`)
  console.log(` Wrong amount distributions (all time)   : ${fullWrongCount}`)
  console.log(`${'='.repeat(70)}\n`)

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
