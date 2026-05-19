/**
 * Historical-aware Level Income Audit
 * For each ROI dist, computes what the downline count WAS on that date
 * using pkg started_at, not current state.
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'
const IST     = 5.5 * 60 * 60 * 1000

const LEVEL_RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]
const round2 = n => parseFloat(n.toFixed(2))
const toIST  = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]
const toUTC  = (dateStr, time) => new Date(dateStr + `T${time}+05:30`)

async function creditBonus(tx, userId, amount, fromUserId, level, remarks, createdAt) {
  const updated = await tx.user.update({ where: { id: userId }, data: { income_wallet_balance: { increment: amount } } })
  await tx.bonus.create({ data: { user_id: userId, from_user_id: fromUserId, type: 'level', level, amount, created_at: createdAt } })
  await tx.incomeLedger.create({ data: { user_id: userId, type: 'credit', amount, balance_after: updated.income_wallet_balance, remarks, reference_type: 'bonus', created_at: createdAt } })
}

async function main() {
  console.log(`\n${'═'.repeat(62)}`)
  console.log(` HISTORICAL-AWARE LEVEL INCOME AUDIT`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE FIX'}`)
  console.log(`${'═'.repeat(62)}\n`)

  console.log('⏳ Loading data...')
  const [users, allPackages, distributions, levelBonuses] = await Promise.all([
    p.user.findMany({ select: { id: true, user_id: true, name: true, status: true, sponsor_id: true } }),
    p.tradePackage.findMany({ select: { id: true, user_id: true, status: true, started_at: true } }),
    p.roiDistribution.findMany({ select: { id: true, user_id: true, amount: true, created_at: true }, orderBy: { id: 'asc' } }),
    p.bonus.findMany({ where: { type: 'level' }, select: { id: true, user_id: true, from_user_id: true, level: true, amount: true, created_at: true } })
  ])

  const uById = new Map(users.map(u => [u.id, u]))

  // For each user, build a sorted list of pkg activation dates
  // so we can compute historical downline counts
  const pkgsByUser = new Map()
  for (const pk of allPackages) {
    if (!pkgsByUser.has(pk.user_id)) pkgsByUser.set(pk.user_id, [])
    pkgsByUser.get(pk.user_id).push(new Date(pk.started_at))
  }

  // Active direct downlines of sponsorId ON a given date
  function historicalDownlineCount(sponsorId, onDate) {
    let count = 0
    for (const u of users) {
      if (u.sponsor_id !== sponsorId) continue
      const dates = pkgsByUser.get(u.id) || []
      if (dates.some(d => d <= onDate)) count++
    }
    return count
  }

  // Was user active on a given date? We use current status as proxy
  // (no status history stored) — conservative: if currently inactive, assume was inactive
  function wasActive(userId) {
    return uById.get(userId)?.status === 'active'
  }

  // Had an active package on a given date?
  function hadActivePkgOn(userId, onDate) {
    return (pkgsByUser.get(userId) || []).some(d => d <= onDate)
  }

  // Level bonus index
  const lvlIdx = new Map()
  for (const b of levelBonuses) {
    const k = `${b.user_id}|${b.from_user_id}|${b.level}|${toIST(b.created_at)}`
    if (!lvlIdx.has(k)) lvlIdx.set(k, [])
    lvlIdx.get(k).push(b)
  }

  let missing = 0, wrong = 0, ineligible = 0, fixed = 0, errs = 0

  for (const dist of distributions) {
    const roiAmt   = parseFloat(dist.amount)
    const distDate = toIST(dist.created_at)
    const distDt   = new Date(dist.created_at)

    let currId = dist.user_id
    let level  = 1

    while (level <= 15) {
      const u = uById.get(currId)
      if (!u?.sponsor_id) break
      const sponsorId = u.sponsor_id
      currId          = sponsorId
      const sponsor   = uById.get(sponsorId)
      if (!sponsor) break

      const rate     = LEVEL_RATES[level] || 0
      const expected = round2(roiAmt * rate / 100)
      const eligible = wasActive(sponsorId) && hadActivePkgOn(sponsorId, distDt) && historicalDownlineCount(sponsorId, distDt) >= level
      const k        = `${sponsorId}|${dist.user_id}|${level}|${distDate}`
      const existing = lvlIdx.get(k) || []

      if (!eligible) {
        // If there's a bonus but should not be → flag it
        if (existing.length > 0) {
          ineligible += existing.length
          console.log(`  ❌ INELIGIBLE bonus #${existing[0].id}: Dist #${dist.id} Lvl ${level} sponsor ${sponsor.user_id}`)
        }
        level++; continue
      }

      if (expected <= 0) { level++; continue }

      if (existing.length === 0) {
        missing++
        console.log(`  ⚠️  MISSING Lvl ${level}: Dist #${dist.id} ${distDate} member ${dist.user_id} → ${sponsor.user_id} $${expected}`)
        if (!DRY_RUN) {
          try {
            await p.$transaction(async tx => {
              await creditBonus(tx, sponsorId, expected, dist.user_id, level,
                `[Backfill] Level ${level} ROI matching (dist #${dist.id}, ${distDate})`,
                toUTC(distDate, '12:00:00'))
            })
            fixed++
            console.log(`    ✅ Credited $${expected} to ${sponsor.user_id}`)
          } catch (e) { errs++; console.error(`    ❌ ${e.message}`) }
        }
      } else if (existing.length > 1) {
        // Keep first, flag extras — but don't auto-reverse (safe)
        ineligible += existing.length - 1
        console.log(`  ❌ DUPLICATE Lvl ${level}: Dist #${dist.id} ${distDate} sponsor ${sponsor.user_id} × ${existing.length}`)
      } else {
        const actual = round2(parseFloat(existing[0].amount))
        if (Math.abs(actual - expected) > 0.005) {
          wrong++
          console.log(`  ❌ WRONG AMOUNT Lvl ${level}: Dist #${dist.id} expected $${expected} got $${actual}`)
        }
      }

      level++
    }
  }

  console.log(`\n${'═'.repeat(62)}`)
  console.log(` SUMMARY`)
  console.log(`${'═'.repeat(62)}`)
  console.log(` Missing bonuses    : ${missing}`)
  console.log(` Wrong amounts      : ${wrong}`)
  console.log(` Ineligible/Dup     : ${ineligible}`)
  if (!DRY_RUN) {
    console.log(` Fixed              : ${fixed}`)
    console.log(` Errors             : ${errs}`)
  }

  if (missing === 0 && wrong === 0 && ineligible === 0) {
    console.log('\n ✅ All level income records are historically correct.')
  } else if (DRY_RUN && missing > 0) {
    console.log('\n ℹ️  DRY RUN. To apply: DRY_RUN=false node scripts/audit_level_historical.js')
  }
  console.log(`${'═'.repeat(62)}\n`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
