/**
 * ============================================================
 *  DEEP ROI AUDIT — Full diagnosis for 18/05 and 19/05/2026
 * ============================================================
 *
 * The user's income ledger shows 5 entries on 19/05/2026.
 * This script digs into ALL income ledger entries (not just
 * RoiDistribution) to understand the full picture:
 *
 *  1. RoiDistribution count per day per package (18th & 19th)
 *  2. Bonus 'trading' count per day per user
 *  3. IncomeLedger entries per day per user (type=credit, ref=roi)
 *  4. Total extra credits that need reversal on 19/05
 *
 * USAGE: node scripts/deep_roi_audit.js
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
function toISTTimeStr(dt) {
  return new Date(new Date(dt).getTime() + IST_OFFSET_MS).toISOString().replace('T', ' ').substring(0, 19) + ' IST'
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
  console.log(` DEEP ROI AUDIT — ${new Date().toISOString()}`)
  console.log(`${'='.repeat(70)}\n`)

  // ── 1. All packages (started ≤ 18/05) ───────────────────────────────────
  const allPkgs = await prisma.tradePackage.findMany({
    where: {
      status:     { in: ['active', 'completed'] },
      started_at: { lte: new Date('2026-05-18T23:59:59+05:30') },
    },
    include: { user: { select: { id: true, user_id: true, name: true } } },
    orderBy: { id: 'asc' },
  })
  console.log(`📦 Packages to audit: ${allPkgs.length}\n`)

  let totalDuplicateROIEntries = 0
  let totalMissing18Entries    = 0
  const pkgsNeedingFix         = []

  for (const pkg of allPkgs) {
    const pkgAmount   = parseFloat(pkg.amount)
    const dailyRoi    = getDailyRoiRate(new Date(pkg.started_at))
    const expectedAmt = parseFloat((pkgAmount * dailyRoi / 100).toFixed(2))

    // RoiDistribution entries
    const roi18 = await prisma.roiDistribution.findMany({
      where: {
        package_id: pkg.id,
        created_at: { gte: new Date('2026-05-18T00:00:00+05:30'), lte: new Date('2026-05-18T23:59:59+05:30') },
      },
      orderBy: { created_at: 'asc' },
    })
    const roi19 = await prisma.roiDistribution.findMany({
      where: {
        package_id: pkg.id,
        created_at: { gte: new Date('2026-05-19T00:00:00+05:30'), lte: new Date('2026-05-19T23:59:59+05:30') },
      },
      orderBy: { created_at: 'asc' },
    })

    // Bonus 'trading' entries by date
    const bonus18 = await prisma.bonus.findMany({
      where: {
        user_id:    pkg.user_id,
        type:       'trading',
        created_at: { gte: new Date('2026-05-18T00:00:00+05:30'), lte: new Date('2026-05-18T23:59:59+05:30') },
        amount:     expectedAmt,
      },
      orderBy: { created_at: 'asc' },
    })
    const bonus19 = await prisma.bonus.findMany({
      where: {
        user_id:    pkg.user_id,
        type:       'trading',
        created_at: { gte: new Date('2026-05-19T00:00:00+05:30'), lte: new Date('2026-05-19T23:59:59+05:30') },
        amount:     expectedAmt,
      },
      orderBy: { created_at: 'asc' },
    })

    // IncomeLedger ROI entries by date
    const ledger18 = await prisma.incomeLedger.findMany({
      where: {
        user_id:        pkg.user_id,
        reference_type: 'roi',
        reference_id:   pkg.id,
        created_at:     { gte: new Date('2026-05-18T00:00:00+05:30'), lte: new Date('2026-05-18T23:59:59+05:30') },
      },
      orderBy: { created_at: 'asc' },
    })
    const ledger19 = await prisma.incomeLedger.findMany({
      where: {
        user_id:        pkg.user_id,
        reference_type: 'roi',
        reference_id:   pkg.id,
        created_at:     { gte: new Date('2026-05-19T00:00:00+05:30'), lte: new Date('2026-05-19T23:59:59+05:30') },
      },
      orderBy: { created_at: 'asc' },
    })

    const needs18  = roi18.length === 0
    const has19dup = roi19.length > 1

    if (needs18 || has19dup) {
      pkgsNeedingFix.push({ pkg, roi18, roi19, bonus18, bonus19, ledger18, ledger19, expectedAmt, dailyRoi })
      if (has19dup) totalDuplicateROIEntries += roi19.length - 1
      if (needs18)  totalMissing18Entries++

      console.log(`\n${'─'.repeat(70)}`)
      console.log(` Package #${pkg.id} | User: ${pkg.user.user_id} (${pkg.user.name}) | $${pkgAmount} | ${dailyRoi}% = $${expectedAmt}/day`)
      console.log(`${'─'.repeat(70)}`)
      console.log(` RoiDistribution: 18/05 = ${roi18.length} entry(s) | 19/05 = ${roi19.length} entry(s)`)
      console.log(` Bonus(trading):   18/05 = ${bonus18.length} entry(s) | 19/05 = ${bonus19.length} entry(s)`)
      console.log(` IncomeLedger:     18/05 = ${ledger18.length} entry(s) | 19/05 = ${ledger19.length} entry(s)`)

      if (has19dup) {
        console.log(`\n  19/05 RoiDistribution IDs (KEEP first, DELETE rest):`)
        for (const r of roi19) {
          console.log(`    #${r.id} | ${toISTTimeStr(r.created_at)} | $${r.amount}`)
        }
      }
      if (needs18) {
        console.log(`  ⚠️  Missing 18/05/2026 ROI entry. Expected: $${expectedAmt}`)
      }
    }
  }

  // ── 2. Summary ──────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(70)}`)
  console.log(` GRAND SUMMARY`)
  console.log(`${'='.repeat(70)}`)
  console.log(` Total packages checked           : ${allPkgs.length}`)
  console.log(` Packages with issues             : ${pkgsNeedingFix.length}`)
  console.log(` Missing 18/05 ROI               : ${totalMissing18Entries} packages`)
  console.log(` Duplicate 19/05 ROI entries      : ${totalDuplicateROIEntries} extra records`)
  console.log(`${'='.repeat(70)}`)

  // ── 3. Show all IncomeLedger credits on 19/05 for each user ─────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` 📋 ALL IncomeLedger credits on 19/05/2026 (reference_type = roi)`)
  console.log(`${'─'.repeat(70)}`)

  // Get distinct user_ids from packages
  const userIds = [...new Set(allPkgs.map(p => p.user_id))]
  for (const uid of userIds) {
    const entries = await prisma.incomeLedger.findMany({
      where: {
        user_id:        uid,
        type:           'credit',
        reference_type: 'roi',
        created_at:     { gte: new Date('2026-05-19T00:00:00+05:30'), lte: new Date('2026-05-19T23:59:59+05:30') },
      },
      orderBy: { created_at: 'asc' },
    })
    if (entries.length > 1) {
      const user = allPkgs.find(p => p.user_id === uid)?.user
      console.log(`\n  User ${user?.user_id} (${user?.name}): ${entries.length} ROI ledger credits on 19/05`)
      for (const e of entries) {
        console.log(`    Ledger #${e.id} | ${toISTTimeStr(e.created_at)} | $${e.amount} | ${e.remarks}`)
      }
    }
  }

  console.log(`\n${'='.repeat(70)}\n`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
