/**
 * ============================================================
 *  LEVEL INCOME FULL AUDIT + FIX  (optimised — single bulk load)
 * ============================================================
 *
 * Pre-loads ALL required data in a handful of queries, then
 * walks every ROI dist × sponsor chain entirely in-process.
 * Completes in seconds regardless of data size.
 *
 * USAGE:
 *   node scripts/audit_level_income.js              # DRY RUN
 *   DRY_RUN=false node scripts/audit_level_income.js  # LIVE FIX
 * ============================================================
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN       = process.env.DRY_RUN !== 'false'
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// Default level rates (index = level, 0-padded at index 0)
const DEFAULT_RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]

function toIST(dt) {
  return new Date(new Date(dt).getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

// ── Credit bonus + ledger in a transaction ───────────────────
async function creditBonus(tx, userId, amount, fromUserId, level, remarks) {
  const updated = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  })
  await tx.bonus.create({
    data: { user_id: userId, from_user_id: fromUserId, type: 'level', level, amount },
  })
  await tx.incomeLedger.create({
    data: {
      user_id: userId, type: 'credit', amount,
      balance_after: updated.income_wallet_balance,
      remarks, reference_type: 'bonus',
    },
  })
}

// ── Reverse a bonus + write debit ledger ─────────────────────
async function reverseBonus(tx, userId, bonusId, amount, remarks) {
  const updated = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { decrement: amount } },
  })
  await tx.bonus.delete({ where: { id: bonusId } })
  await tx.incomeLedger.create({
    data: {
      user_id: userId, type: 'debit', amount,
      balance_after: updated.income_wallet_balance,
      remarks: `[Fix] Reversed wrong level bonus: ${remarks}`,
      reference_type: 'bonus',
    },
  })
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(` LEVEL INCOME AUDIT — ${new Date().toISOString()}`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN (read-only)' : '🚀 LIVE FIX'}`)
  console.log(`${'═'.repeat(70)}\n`)

  // ── Load rates ───────────────────────────────────────────────
  let RATES = DEFAULT_RATES
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'level_bonus_rates' } })
    if (s) RATES = JSON.parse(s.value)
  } catch {}
  console.log(` Level rates: ${RATES.slice(1).join('%, ')}%`)

  // ── BULK LOAD (5 queries total) ───────────────────────────────
  console.log('\n⏳ Loading data...')

  const [distributions, users, allPackages, allBonuses] = await Promise.all([
    // All ROI distributions with package + member info
    prisma.roiDistribution.findMany({
      select: {
        id: true, amount: true, created_at: true, package_id: true,
        package: {
          select: {
            user_id: true,
            user: { select: { id: true, user_id: true, sponsor_id: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    }),

    // All users (for sponsor chain traversal + eligibility)
    prisma.user.findMany({
      select: {
        id: true, user_id: true, name: true, status: true, sponsor_id: true,
      },
    }),

    // All active packages (to check hasActivePkg per user)
    prisma.tradePackage.findMany({
      where:  { status: 'active' },
      select: { id: true, user_id: true },
    }),

    // All existing level bonuses
    prisma.bonus.findMany({
      where:   { type: 'level' },
      select:  { id: true, user_id: true, from_user_id: true, level: true, amount: true, created_at: true },
      orderBy: { id: 'asc' },
    }),
  ])

  console.log(`✅ Loaded: ${distributions.length} ROI dists | ${users.length} users | ${allPackages.length} active pkgs | ${allBonuses.length} level bonuses`)

  // ── Build lookup maps ─────────────────────────────────────────
  // userById
  const userById = new Map(users.map(u => [u.id, u]))

  // usersWithActivePkg: Set<userId>
  const usersWithActivePkg = new Set(allPackages.map(p => p.user_id))

  // activeDirectDownlineCount: Map<sponsorId → count of direct referrals with active pkg>
  const activeDirectDownlineCount = new Map()
  for (const u of users) {
    if (u.sponsor_id && usersWithActivePkg.has(u.id)) {
      activeDirectDownlineCount.set(u.sponsor_id,
        (activeDirectDownlineCount.get(u.sponsor_id) || 0) + 1)
    }
  }

  // bonusIndex: Map<`${sponsorId}|${memberId}|${level}|${dateStr}` → Bonus[]>
  const bonusIndex = new Map()
  for (const b of allBonuses) {
    const dateStr = toIST(b.created_at)
    const key     = `${b.user_id}|${b.from_user_id}|${b.level}|${dateStr}`
    if (!bonusIndex.has(key)) bonusIndex.set(key, [])
    bonusIndex.get(key).push(b)
  }

  // ── Overview ─────────────────────────────────────────────────
  const lvlByLevel = {}
  for (const b of allBonuses) {
    if (!lvlByLevel[b.level]) lvlByLevel[b.level] = { count: 0, sum: 0 }
    lvlByLevel[b.level].count++
    lvlByLevel[b.level].sum += parseFloat(b.amount)
  }
  console.log(`\n📊 Level bonus breakdown in DB:`)
  for (const [lvl, info] of Object.entries(lvlByLevel).sort((a,b) => +a[0] - +b[0])) {
    console.log(`   Level ${String(lvl).padStart(2)}: ${String(info.count).padStart(4)} records | $${info.sum.toFixed(2)}`)
  }

  // ── AUDIT LOOP ────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`)
  console.log(` DETAILED AUDIT`)
  console.log(`${'─'.repeat(70)}`)

  let totalMissing  = 0
  let totalWrong    = 0
  let totalDup      = 0
  let totalFixed    = 0
  let totalErrors   = 0

  // Collect all actions first (in DRY_RUN mode just report; in LIVE execute each)
  for (const dist of distributions) {
    const member   = dist.package.user
    const roiAmt   = parseFloat(dist.amount)
    const distDate = toIST(dist.created_at)

    let level     = 1
    let currentId = member.id

    while (level <= 15) {
      const u = userById.get(currentId)
      if (!u?.sponsor_id) break

      const sponsorId = u.sponsor_id
      currentId       = sponsorId

      const sponsor = userById.get(sponsorId)
      if (!sponsor) break

      const rate           = RATES[level] || 0
      const expectedAmt    = parseFloat((roiAmt * rate / 100).toFixed(2))
      const hasActivePkg   = usersWithActivePkg.has(sponsorId)
      const activeDownline = activeDirectDownlineCount.get(sponsorId) || 0
      const isEligible     = sponsor.status === 'active' && hasActivePkg && activeDownline >= level

      const key      = `${sponsorId}|${member.id}|${level}|${distDate}`
      const existing = bonusIndex.get(key) || []

      if (!isEligible) {
        if (existing.length > 0) {
          for (const ex of existing) {
            const actual = parseFloat(ex.amount)
            totalWrong++
            console.log(`\n  ❌ INELIGIBLE PAYMENT | Dist #${dist.id} | ${distDate} | Level ${level}`)
            console.log(`     Sponsor ${sponsor.user_id} (${sponsor.name})`)
            console.log(`     status=${sponsor.status} | hasPkg=${hasActivePkg} | downlines=${activeDownline} (need ≥${level})`)
            console.log(`     Bonus #${ex.id} = $${actual} → REVERSE`)
            if (!DRY_RUN) {
              try {
                await prisma.$transaction(async tx => {
                  await reverseBonus(tx, sponsorId, ex.id, actual,
                    `Lvl ${level} from ${member.user_id} on dist #${dist.id} ${distDate} — ineligible sponsor`)
                })
                totalFixed++
                console.log(`     ✅ Reversed`)
              } catch (err) { totalErrors++; console.error(`     ❌ ${err.message}`) }
            }
          }
        }
        level++; continue
      }

      if (expectedAmt <= 0) { level++; continue }

      if (existing.length === 0) {
        totalMissing++
        console.log(`\n  ⚠️  MISSING | Dist #${dist.id} | ${distDate} | Level ${level}`)
        console.log(`     Sponsor ${sponsor.user_id} (${sponsor.name}) | $${roiAmt} × ${rate}% = $${expectedAmt}`)
        if (!DRY_RUN) {
          try {
            await prisma.$transaction(async tx => {
              await creditBonus(tx, sponsorId, expectedAmt, member.id, level,
                `[Backfill] Level ${level} ROI matching from ${member.user_id} (dist #${dist.id}, ${distDate})`)
            })
            totalFixed++
            console.log(`     ✅ Credited $${expectedAmt} to ${sponsor.user_id}`)
          } catch (err) { totalErrors++; console.error(`     ❌ ${err.message}`) }
        }
      } else if (existing.length === 1) {
        const actual = parseFloat(existing[0].amount)
        if (Math.abs(actual - expectedAmt) > 0.005) {
          totalWrong++
          console.log(`\n  ❌ WRONG AMOUNT | Dist #${dist.id} | ${distDate} | Level ${level}`)
          console.log(`     Sponsor ${sponsor.user_id} (${sponsor.name}) | ROI $${roiAmt} × ${rate}%`)
          console.log(`     Expected $${expectedAmt} | Got $${actual} | Diff $${(actual - expectedAmt).toFixed(4)}`)
          if (!DRY_RUN) {
            try {
              await prisma.$transaction(async tx => {
                await reverseBonus(tx, sponsorId, existing[0].id, actual,
                  `Lvl ${level} from ${member.user_id} dist #${dist.id} ${distDate} — wrong amt`)
                await creditBonus(tx, sponsorId, expectedAmt, member.id, level,
                  `[Fix] Level ${level} ROI matching from ${member.user_id} (dist #${dist.id}, ${distDate})`)
              })
              totalFixed++
              console.log(`     ✅ Corrected: -$${actual} +$${expectedAmt}`)
            } catch (err) { totalErrors++; console.error(`     ❌ ${err.message}`) }
          }
        }
      } else {
        // duplicates
        const toRemove = existing.slice(1)
        totalDup += toRemove.length
        console.log(`\n  ❌ DUPLICATE | Dist #${dist.id} | ${distDate} | Level ${level}`)
        console.log(`     Sponsor ${sponsor.user_id} has ${existing.length} records (expected 1) — removing ${toRemove.length} extra`)
        if (!DRY_RUN) {
          for (const dup of toRemove) {
            try {
              await prisma.$transaction(async tx => {
                await reverseBonus(tx, sponsorId, dup.id, parseFloat(dup.amount),
                  `Lvl ${level} from ${member.user_id} dist #${dist.id} ${distDate} — duplicate`)
              })
              totalFixed++
              console.log(`     ✅ Removed dup #${dup.id}`)
            } catch (err) { totalErrors++; console.error(`     ❌ ${err.message}`) }
          }
        }
      }

      level++
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`)
  console.log(` AUDIT SUMMARY`)
  console.log(`${'═'.repeat(70)}`)
  console.log(` ROI distributions checked       : ${distributions.length}`)
  console.log(` Missing level bonuses           : ${totalMissing}`)
  console.log(` Wrong-amount bonuses            : ${totalWrong}`)
  console.log(` Duplicate bonuses               : ${totalDup}`)
  if (!DRY_RUN) {
    console.log(` Fixed (created/corrected)       : ${totalFixed}`)
    console.log(` Errors                          : ${totalErrors}`)
  }

  if (totalMissing === 0 && totalWrong === 0 && totalDup === 0) {
    console.log(`\n ✅ All level income records are correct — nothing to fix.`)
  } else if (DRY_RUN) {
    console.log(`\n ℹ️  DRY RUN — no data was written.`)
    console.log(` To apply fixes:  DRY_RUN=false node scripts/audit_level_income.js`)
  } else {
    console.log(`\n ✅ Fix complete. Re-run in DRY_RUN mode to verify.`)
  }
  console.log(`${'═'.repeat(70)}\n`)

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error('Fatal:', err)
  await prisma.$disconnect()
  process.exit(1)
})
