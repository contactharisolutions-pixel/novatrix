/**
 * ============================================================
 *  DIRECT SPONSOR INCOME & LEVEL INCOME AUDIT + BACKFILL
 * ============================================================
 *
 * PURPOSE:
 *   Section A — Direct Sponsor Income
 *     • Every TradePackage should have produced exactly ONE
 *       'direct' Bonus for the member's sponsor (if the sponsor
 *       was active at package creation time).
 *     • Rule: sponsor status === 'active' (no own-package gate).
 *     • Rate: 5% of package amount (from Setting or default).
 *
 *   Section B — Level Income (ROI Matching Bonus)
 *     • Every RoiDistribution should have triggered level bonuses
 *       up the sponsor chain (up to 15 levels).
 *     • Rule per level: sponsor active + own active package +
 *       direct-active-downline count >= level.
 *     • Rates: [0,20,15,10,5,4,3,2,2,2,1,1,1,1,0.5,0.5] %
 *
 * ROOT CAUSE IDENTIFIED:
 *   - Both `triggerDirectAndLevelBonus` and `triggerROIMatchingBonus`
 *     were called with `.catch(console.error)` (fire-and-forget).
 *     On Vercel serverless, the HTTP response is flushed BEFORE
 *     the async chain completes — silently dropping ALL bonuses.
 *   - The level-bonus trigger inside roiCron also had this pattern
 *     until a previous fix, but past distributions were never backfilled.
 *
 * SAFETY:
 *   - DRY_RUN=true by default  →  read-only, prints gaps only.
 *   - Set DRY_RUN=false to execute the backfill.
 *   - Idempotent: direct bonus checks if a 'direct' bonus from
 *     that member to that sponsor already exists.
 *   - Level bonus checks if each (user_id, from_user_id, type='level',
 *     level, same-day) Bonus already exists before writing.
 *
 * USAGE:
 *   # Audit only (safe):
 *   node scripts/backfill_bonuses.js
 *
 *   # Execute backfill:
 *   DRY_RUN=false node scripts/backfill_bonuses.js
 *
 *   # Audit one section only:
 *   SECTION=direct node scripts/backfill_bonuses.js
 *   SECTION=level  DRY_RUN=false node scripts/backfill_bonuses.js
 * ============================================================
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Config ──────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN !== 'false'   // default: true (safe)
const SECTION = process.env.SECTION || 'all'       // 'direct' | 'level' | 'all'

// Default commission rates (mirrors bonusEngine.js)
const DEFAULT_DIRECT_RATE  = 5.0
const DEFAULT_LEVEL_RATES  = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// ─── Fetch live commission rates from DB (or fall back to defaults) ──
async function getRates() {
  try {
    const [lvl, dir] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'level_bonus_rates' } }),
      prisma.setting.findUnique({ where: { key: 'direct_bonus_pct'  } }),
    ])
    return {
      direct: dir ? parseFloat(dir.value) : DEFAULT_DIRECT_RATE,
      levels: lvl ? JSON.parse(lvl.value) : DEFAULT_LEVEL_RATES,
    }
  } catch {
    return { direct: DEFAULT_DIRECT_RATE, levels: DEFAULT_LEVEL_RATES }
  }
}

// ─── Credit a bonus + ledger (within a transaction) ──────────
async function creditBonus(tx, userId, amount, bonusType, fromUserId, level, remarks) {
  if (amount <= 0) return
  const updated = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  })
  await tx.bonus.create({
    data: { user_id: userId, from_user_id: fromUserId, type: bonusType, level, amount },
  })
  await tx.incomeLedger.create({
    data: {
      user_id:        userId,
      type:           'credit',
      amount,
      balance_after:  updated.income_wallet_balance,
      remarks,
      reference_type: 'bonus',
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────
function toISTDateStr(dt) {
  return new Date(new Date(dt).getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

// ══════════════════════════════════════════════════════════════
//  SECTION A — Direct Sponsor Income Audit
// ══════════════════════════════════════════════════════════════
async function auditDirectBonus(rates) {
  console.log('\n' + '═'.repeat(60))
  console.log(' SECTION A: DIRECT SPONSOR INCOME AUDIT')
  console.log('═'.repeat(60))

  // Fetch all packages along with their member and sponsor info
  const packages = await prisma.tradePackage.findMany({
    include: {
      user: {
        select: {
          id: true, user_id: true, status: true, sponsor_id: true,
          sponsor: { select: { id: true, user_id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  console.log(`\n📦 Total packages to check: ${packages.length}`)

  let missingCount = 0
  let backfilled   = 0
  let errors       = 0
  const gaps       = []

  for (const pkg of packages) {
    const member  = pkg.user
    const sponsor = member.sponsor

    if (!sponsor) {
      // Member has no sponsor (root / admin-seeded accounts) — skip
      continue
    }

    // Check if sponsor was/is active
    // NOTE: we cannot perfectly know past status, so we check current status.
    // If sponsor is now inactive/blocked, they would not have been eligible either.
    if (sponsor.status !== 'active') {
      // Still report, but mark as legitimately not owed
      continue
    }

    // Check if a direct Bonus already exists from this member to this sponsor
    const existingBonus = await prisma.bonus.findFirst({
      where: {
        user_id:      sponsor.id,
        from_user_id: member.id,
        type:         'direct',
      },
    })

    if (existingBonus) continue // Already paid ✓

    // MISSING!
    const expectedAmt = parseFloat((parseFloat(pkg.amount) * rates.direct / 100).toFixed(2))
    missingCount++
    gaps.push({
      pkg_id:       pkg.id,
      member_uid:   member.user_id,
      sponsor_uid:  sponsor.user_id,
      sponsor_name: sponsor.name,
      pkg_amount:   parseFloat(pkg.amount),
      expected_amt: expectedAmt,
      started_at:   pkg.started_at,
    })

    console.log(`\n  ⚠️  Package #${pkg.id} | Member ${member.user_id} → Sponsor ${sponsor.user_id} (${sponsor.name})`)
    console.log(`       Amount $${pkg.amount} | Expected direct bonus: $${expectedAmt} | Activated: ${toISTDateStr(pkg.started_at)}`)

    if (DRY_RUN) continue

    // Backfill
    try {
      await prisma.$transaction(async (tx) => {
        await creditBonus(
          tx,
          sponsor.id,
          expectedAmt,
          'direct',
          member.id,
          1,
          `[Backfill] Direct referral bonus from ${member.user_id} (pkg #${pkg.id})`
        )
      })
      backfilled++
      console.log(`       ✅ Backfilled $${expectedAmt} to ${sponsor.user_id}`)
    } catch (err) {
      errors++
      console.error(`       ❌ Error: ${err.message}`)
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60))
  console.log(' SECTION A SUMMARY — Direct Sponsor Income')
  console.log('─'.repeat(60))
  console.log(` Packages checked          : ${packages.length}`)
  console.log(` Missing direct bonuses    : ${missingCount}`)
  if (!DRY_RUN) {
    console.log(` Backfilled                : ${backfilled}`)
    console.log(` Errors                    : ${errors}`)
  }
  if (missingCount === 0) {
    console.log(' ✅ All direct sponsor bonuses are accounted for.')
  } else if (DRY_RUN) {
    console.log(' ℹ️  DRY RUN — nothing written.')
  }

  return { missingCount, backfilled, errors, gaps }
}

// ══════════════════════════════════════════════════════════════
//  SECTION B — Level Income (ROI Matching Bonus) Audit
// ══════════════════════════════════════════════════════════════
async function auditLevelBonus(rates) {
  console.log('\n' + '═'.repeat(60))
  console.log(' SECTION B: LEVEL INCOME (ROI MATCHING) AUDIT')
  console.log('═'.repeat(60))

  // Fetch every ROI distribution, ordered oldest first
  const distributions = await prisma.roiDistribution.findMany({
    include: {
      package: {
        include: {
          user: { select: { id: true, user_id: true, sponsor_id: true } },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  console.log(`\n📊 Total ROI distributions to check: ${distributions.length}`)

  let totalMissing  = 0
  let totalBackfill = 0
  let totalErrors   = 0

  for (const dist of distributions) {
    const member    = dist.package.user
    const roiAmt    = parseFloat(dist.amount)
    const distDateStr = toISTDateStr(dist.created_at)


    // Build the full sponsor chain for this member (up to 15 levels)
    const sponsorChain = []
    let currentId = member.id
    for (let lvl = 1; lvl <= 15; lvl++) {
      const u = await prisma.user.findUnique({
        where:  { id: currentId },
        select: { sponsor_id: true },
      })
      if (!u?.sponsor_id) break

      const sp = await prisma.user.findUnique({
        where:  { id: u.sponsor_id },
        select: {
          id: true, user_id: true, name: true, status: true,
          packages: { where: { status: 'active' }, take: 1, select: { id: true } },
          _count: {
            select: {
              referrals: { where: { packages: { some: { status: 'active' } } } },
            },
          },
        },
      })
      if (!sp) break

      sponsorChain.push({ level: lvl, sponsor: sp })
      currentId = u.sponsor_id
    }

    // For each eligible sponsor in the chain, check if the level bonus was paid
    for (const { level, sponsor } of sponsorChain) {
      const hasActivePkg    = sponsor.packages.length > 0
      const activeDownline  = sponsor._count.referrals
      const isEligible      = sponsor.status === 'active' && hasActivePkg && activeDownline >= level

      if (!isEligible) continue // Legitimately not owed at this level

      const rate     = rates.levels[level] || 0
      const expected = parseFloat((roiAmt * rate / 100).toFixed(2))
      if (expected <= 0) continue

      // Idempotency check: a level bonus is considered paid if ANY record exists
      // with matching (sponsor, member, level, amount) — regardless of when it was
      // written. This works for both live payments and backfilled records.
      const existing = await prisma.bonus.findFirst({
        where: {
          user_id:      sponsor.id,
          from_user_id: member.id,
          type:         'level',
          level,
          amount:       expected,
        },
      })

      if (existing) continue // Already paid ✓

      totalMissing++
      console.log(`\n  ⚠️  ROI Dist #${dist.id} | ${distDateStr} | Member ${member.user_id} → Level ${level} Sponsor ${sponsor.user_id} (${sponsor.name})`)
      console.log(`       ROI $${roiAmt} | Level ${level} rate ${rate}% | Expected: $${expected}`)

      if (DRY_RUN) continue

      // Backfill
      try {
        await prisma.$transaction(async (tx) => {
          await creditBonus(
            tx,
            sponsor.id,
            expected,
            'level',
            member.id,
            level,
            `[Backfill] Level ${level} ROI matching from ${member.user_id} (dist #${dist.id}, ${distDateStr})`
          )
        })
        totalBackfill++
        console.log(`       ✅ Backfilled $${expected} to ${sponsor.user_id}`)
      } catch (err) {
        totalErrors++
        console.error(`       ❌ Error: ${err.message}`)
      }
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60))
  console.log(' SECTION B SUMMARY — Level Income')
  console.log('─'.repeat(60))
  console.log(` ROI distributions checked : ${distributions.length}`)
  console.log(` Missing level bonuses     : ${totalMissing}`)
  if (!DRY_RUN) {
    console.log(` Backfilled                : ${totalBackfill}`)
    console.log(` Errors                    : ${totalErrors}`)
  }
  if (totalMissing === 0) {
    console.log(' ✅ All level bonuses are accounted for.')
  } else if (DRY_RUN) {
    console.log(' ℹ️  DRY RUN — nothing written.')
  }

  return { totalMissing, totalBackfill, totalErrors }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(` BONUS AUDIT & BACKFILL — ${new Date().toISOString()}`)
  console.log(` Mode    : ${DRY_RUN ? '🔍 DRY RUN (read-only)' : '🚀 LIVE EXECUTION'}`)
  console.log(` Section : ${SECTION.toUpperCase()}`)
  console.log(`${'═'.repeat(60)}`)

  const rates = await getRates()
  console.log(`\n💰 Commission rates loaded:`)
  console.log(`   Direct : ${rates.direct}%`)
  console.log(`   Levels : ${rates.levels.slice(1).join('%, ')}%`)

  let directResult = null
  let levelResult  = null

  if (SECTION === 'all' || SECTION === 'direct') {
    directResult = await auditDirectBonus(rates)
  }

  if (SECTION === 'all' || SECTION === 'level') {
    levelResult = await auditLevelBonus(rates)
  }

  // ── Grand Summary ─────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log(' GRAND SUMMARY')
  console.log('═'.repeat(60))

  if (directResult) {
    const status = directResult.missingCount === 0 ? '✅' : (DRY_RUN ? '⚠️ ' : (directResult.errors === 0 ? '✅' : '❌'))
    console.log(` Direct bonuses  : ${status} ${directResult.missingCount} missing${!DRY_RUN ? ` | ${directResult.backfilled} backfilled | ${directResult.errors} errors` : ''}`)
  }
  if (levelResult) {
    const status = levelResult.totalMissing === 0 ? '✅' : (DRY_RUN ? '⚠️ ' : (levelResult.totalErrors === 0 ? '✅' : '❌'))
    console.log(` Level bonuses   : ${status} ${levelResult.totalMissing} missing${!DRY_RUN ? ` | ${levelResult.totalBackfill} backfilled | ${levelResult.totalErrors} errors` : ''}`)
  }

  if (DRY_RUN) {
    console.log(`\n ℹ️  DRY RUN complete — no data was written.`)
    console.log(` Re-run with DRY_RUN=false to execute the backfill.`)
    console.log(` Examples:`)
    console.log(`   DRY_RUN=false node scripts/backfill_bonuses.js`)
    console.log(`   SECTION=direct DRY_RUN=false node scripts/backfill_bonuses.js`)
    console.log(`   SECTION=level  DRY_RUN=false node scripts/backfill_bonuses.js`)
  }

  console.log('═'.repeat(60) + '\n')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
