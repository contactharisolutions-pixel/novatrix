/**
 * ================================================================
 *  MASTER INCOME AUDIT — All Income Types
 *  ROI | Direct Sponsor | Level (15-lvl) | Rank Reward | Royalty
 * ================================================================
 * DRY_RUN=true  (default) → report only
 * DRY_RUN=false           → apply fixes
 * SECTION=roi|direct|level|reward|royalty|all
 * ================================================================
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'
const SECTION = process.env.SECTION || 'all'
const IST     = 5.5 * 60 * 60 * 1000

const LEVEL_RATES  = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]
const DIRECT_RATE  = 5.0
const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30')

const toIST  = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]
const toUTC  = (dateStr, time) => new Date(dateStr + `T${time}+05:30`)
const round2 = n => parseFloat(n.toFixed(2))

// ── helpers ────────────────────────────────────────────────────
async function creditBonus(tx, userId, amount, type, fromUserId, level, remarks, createdAt) {
  const data = { user_id: userId, from_user_id: fromUserId, type, level, amount }
  if (createdAt) data.created_at = createdAt
  const updated = await tx.user.update({ where: { id: userId }, data: { income_wallet_balance: { increment: amount } } })
  await tx.bonus.create({ data })
  const ledgerData = { user_id: userId, type: 'credit', amount, balance_after: updated.income_wallet_balance, remarks, reference_type: type }
  if (createdAt) ledgerData.created_at = createdAt
  await tx.incomeLedger.create({ data: ledgerData })
}

async function reverseBonus(tx, userId, bonusId, amount, remarks) {
  const updated = await tx.user.update({ where: { id: userId }, data: { income_wallet_balance: { decrement: amount } } })
  await tx.bonus.delete({ where: { id: bonusId } })
  await tx.incomeLedger.create({ data: { user_id: userId, type: 'debit', amount, balance_after: updated.income_wallet_balance, remarks: `[Fix] ${remarks}`, reference_type: 'bonus' } })
}

let issues = [], fixes = 0, errors = 0

function report(tag, msg) {
  issues.push({ tag, msg })
  console.log(`  ${tag} ${msg}`)
}

// ── SECTION 1: ROI Income ──────────────────────────────────────
async function auditROI(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 1: ROI INCOME')
  console.log('══════════════════════════════════════════════════════')

  const { packages, distributions, tradingBonuses } = data

  // Build dist index: pkgId+date → [dist]
  const distIdx = new Map()
  for (const d of distributions) {
    const k = `${d.package_id}|${toIST(d.created_at)}`
    if (!distIdx.has(k)) distIdx.set(k, [])
    distIdx.get(k).push(d)
  }

  // Build trading bonus index: userId+date → [bonus]
  const tradIdx = new Map()
  for (const b of tradingBonuses) {
    const k = `${b.user_id}|${toIST(b.created_at)}`
    if (!tradIdx.has(k)) tradIdx.set(k, [])
    tradIdx.get(k).push(b)
  }

  // Check for duplicates in distributions
  let dupDist = 0, dupTrad = 0
  for (const [k, arr] of distIdx) {
    if (arr.length > 1) {
      dupDist += arr.length - 1
      report('❌', `DUPLICATE RoiDistribution: pkg|date=${k} has ${arr.length} records`)
      if (!DRY_RUN) {
        for (const dup of arr.slice(1)) {
          await prisma.roiDistribution.delete({ where: { id: dup.id } }).catch(e => { errors++; console.error('    err:', e.message) })
          fixes++
        }
      }
    }
  }

  // Check trading bonuses vs distributions — each ROI dist should produce exactly 1 trading bonus
  for (const d of distributions) {
    const k = `${d.user_id}|${toIST(d.created_at)}`
    const tradArr = tradIdx.get(k) || []
    const distArr = distIdx.get(`${d.package_id}|${toIST(d.created_at)}`) || []
    if (distArr.length === 1 && tradArr.length === 0) {
      report('⚠️ ', `MISSING trading bonus: Dist #${d.id} user ${d.user_id} ${toIST(d.created_at)} $${d.amount}`)
    }
  }

  // Check ROI amounts — 2% early, 1% mid, 0.5% late
  for (const pkg of packages) {
    const pkgDists = distributions.filter(d => d.package_id === pkg.id)
    for (const d of pkgDists) {
      const pkgStart   = new Date(pkg.started_at)
      const effStart   = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart
      const diffDays   = Math.max(0, Math.ceil((effStart - PLATFORM_LAUNCH) / 86400000))
      const expectedRate = diffDays <= 30 ? 2.0 : diffDays <= 120 ? 1.0 : 0.5
      const expected     = round2(parseFloat(pkg.amount) * expectedRate / 100)
      const actual       = round2(parseFloat(d.amount))
      if (Math.abs(actual - expected) > 0.01 && actual !== round2(parseFloat(pkg.max_return) - parseFloat(pkg.total_earned) + actual)) {
        report('❌', `WRONG ROI amount: Dist #${d.id} pkg #${pkg.id} ${toIST(d.created_at)}: expected $${expected} (${expectedRate}%) got $${actual}`)
      }
    }
  }

  console.log(`  Duplicate distributions: ${dupDist} | Duplicate trading bonuses: ${dupTrad}`)
  if (dupDist === 0) console.log('  ✅ No duplicate ROI distributions')
}

// ── SECTION 2: Direct Sponsor Income ──────────────────────────
async function auditDirect(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 2: DIRECT SPONSOR INCOME')
  console.log('══════════════════════════════════════════════════════')

  const { users, packages, directBonuses } = data
  const uById = new Map(users.map(u => [u.id, u]))

  // Index: fromUserId → [bonus]
  const directIdx = new Map()
  for (const b of directBonuses) {
    if (!directIdx.has(b.from_user_id)) directIdx.set(b.from_user_id, [])
    directIdx.get(b.from_user_id).push(b)
  }

  let missing = 0, wrong = 0, dup = 0
  for (const pkg of packages) {
    const member  = uById.get(pkg.user_id)
    if (!member?.sponsor_id) continue
    const sponsor = uById.get(member.sponsor_id)
    if (!sponsor) continue

    const expected = round2(parseFloat(pkg.amount) * DIRECT_RATE / 100)
    const existing = (directIdx.get(pkg.user_id) || [])

    if (existing.length === 0) {
      // Only flag if sponsor was active at the time
      if (sponsor.status === 'active') {
        missing++
        report('⚠️ ', `MISSING direct bonus: pkg #${pkg.id} member ${member.user_id} → sponsor ${sponsor.user_id} expected $${expected}`)
        if (!DRY_RUN) {
          try {
            await prisma.$transaction(async tx => {
              await creditBonus(tx, sponsor.id, expected, 'direct', member.id, 1,
                `[Backfill] Direct referral bonus from ${member.user_id}`, new Date(pkg.started_at))
            })
            fixes++
          } catch (e) { errors++; console.error('    err:', e.message) }
        }
      }
    } else if (existing.length > 1) {
      dup += existing.length - 1
      report('❌', `DUPLICATE direct bonus: member ${member.user_id} has ${existing.length} direct bonus records`)
      if (!DRY_RUN) {
        for (const dup of existing.slice(1)) {
          try {
            await prisma.$transaction(async tx => {
              await reverseBonus(tx, sponsor.id, dup.id, parseFloat(dup.amount), `Dup direct from ${member.user_id}`)
            })
            fixes++
          } catch (e) { errors++; console.error('    err:', e.message) }
        }
      }
    } else {
      const actual = round2(parseFloat(existing[0].amount))
      if (Math.abs(actual - expected) > 0.01) {
        wrong++
        report('❌', `WRONG direct bonus: pkg #${pkg.id} expected $${expected} got $${actual}`)
      }
    }
  }

  if (missing === 0 && wrong === 0 && dup === 0) console.log('  ✅ All direct sponsor bonuses correct')
  else console.log(`  Missing: ${missing} | Wrong: ${wrong} | Duplicates: ${dup}`)
}

// ── SECTION 3: Level Income ────────────────────────────────────
async function auditLevel(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 3: LEVEL INCOME (15-level ROI Matching)')
  console.log('══════════════════════════════════════════════════════')

  const { users, distributions, levelBonuses, activePkgSet, downlineCount } = data
  const uById = new Map(users.map(u => [u.id, u]))

  // Build bonus index: sponsorId|memberId|level|date → [bonus]
  const lvlIdx = new Map()
  for (const b of levelBonuses) {
    const k = `${b.user_id}|${b.from_user_id}|${b.level}|${toIST(b.created_at)}`
    if (!lvlIdx.has(k)) lvlIdx.set(k, [])
    lvlIdx.get(k).push(b)
  }

  let missing = 0, wrong = 0, dup = 0

  for (const dist of distributions) {
    const roiAmt   = parseFloat(dist.amount)
    const distDate = toIST(dist.created_at)
    let currId = dist.user_id
    let level  = 1

    while (level <= 15) {
      const u = uById.get(currId)
      if (!u?.sponsor_id) break
      const sponsorId = u.sponsor_id
      currId = sponsorId
      const sponsor = uById.get(sponsorId)
      if (!sponsor) break

      const rate        = LEVEL_RATES[level] || 0
      const expected    = round2(roiAmt * rate / 100)
      const eligible    = sponsor.status === 'active' && activePkgSet.has(sponsorId) && (downlineCount.get(sponsorId) || 0) >= level
      const k           = `${sponsorId}|${dist.user_id}|${level}|${distDate}`
      const existing    = lvlIdx.get(k) || []

      if (!eligible) {
        if (existing.length > 0) {
          dup += existing.length
          for (const ex of existing) {
            report('❌', `INELIGIBLE level bonus: Dist #${dist.id} Lvl ${level} Sponsor ${sponsor.user_id} $${parseFloat(ex.amount)} → REVERSE`)
            if (!DRY_RUN) {
              try {
                await prisma.$transaction(async tx => reverseBonus(tx, sponsorId, ex.id, parseFloat(ex.amount), `Ineligible Lvl ${level} from ${dist.user_id} dist #${dist.id}`))
                fixes++
              } catch (e) { errors++; console.error('    err:', e.message) }
            }
          }
        }
        level++; continue
      }

      if (expected <= 0) { level++; continue }

      if (existing.length === 0) {
        missing++
        report('⚠️ ', `MISSING Lvl ${level}: Dist #${dist.id} ${distDate} member ${dist.user_id} → ${sponsor.user_id} $${expected}`)
        if (!DRY_RUN) {
          try {
            await prisma.$transaction(async tx => {
              await creditBonus(tx, sponsorId, expected, 'level', dist.user_id, level,
                `[Backfill] Level ${level} ROI matching from dist #${dist.id} (${distDate})`, toUTC(distDate, '12:00:00'))
            })
            fixes++
          } catch (e) { errors++; console.error('    err:', e.message) }
        }
      } else if (existing.length > 1) {
        dup += existing.length - 1
        for (const ex of existing.slice(1)) {
          report('❌', `DUPLICATE Lvl ${level}: Dist #${dist.id} Sponsor ${sponsor.user_id}`)
          if (!DRY_RUN) {
            try {
              await prisma.$transaction(async tx => reverseBonus(tx, sponsorId, ex.id, parseFloat(ex.amount), `Dup Lvl ${level} dist #${dist.id}`))
              fixes++
            } catch (e) { errors++; console.error('    err:', e.message) }
          }
        }
      } else {
        const actual = round2(parseFloat(existing[0].amount))
        if (Math.abs(actual - expected) > 0.005) {
          wrong++
          report('❌', `WRONG Lvl ${level}: Dist #${dist.id} ${distDate} expected $${expected} got $${actual}`)
        }
      }
      level++
    }
  }

  if (missing === 0 && wrong === 0 && dup === 0) console.log('  ✅ All level income records correct')
  else console.log(`  Missing: ${missing} | Wrong: ${wrong} | Ineligible/Dup: ${dup}`)
}

// ── SECTION 4: Rank & Reward Income ───────────────────────────
async function auditReward(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 4: RANK & REWARD INCOME')
  console.log('══════════════════════════════════════════════════════')

  const { rewardBonuses } = data
  const RANKS = [
    { id:1, name:'Pearl',                 reward:100 },
    { id:2, name:'Sapphire',              reward:250 },
    { id:3, name:'Ruby',                  reward:500 },
    { id:4, name:'Emerald',               reward:1000 },
    { id:5, name:'Platinum',              reward:2500 },
    { id:6, name:'Royal Platinum',        reward:5000 },
    { id:7, name:'Diamond',               reward:10000 },
    { id:8, name:'Blue Diamond',          reward:25000 },
    { id:9, name:'Green Diamond',         reward:50000 },
    { id:10,name:'Crown Diamond',         reward:100000 },
    { id:11,name:'Queen',                 reward:250000 },
    { id:12,name:'Global Vice President', reward:500000 },
    { id:13,name:'King',                  reward:1000000 },
    { id:14,name:'Global Trader',         reward:2500000 },
    { id:15,name:'Market Maker',          reward:5000000 },
  ]
  const rankByName = new Map(RANKS.map(r => [r.name, r]))

  let wrong = 0
  for (const b of rewardBonuses) {
    // Extract rank name from remarks
    const match = (b.remarks || '').match(/Rank Achievement: (.+)/)
    if (!match) continue
    const rank = rankByName.get(match[1].trim())
    if (!rank) continue
    const expected = rank.reward
    const actual   = round2(parseFloat(b.amount))
    if (Math.abs(actual - expected) > 0.01) {
      wrong++
      report('❌', `WRONG reward amount: Bonus #${b.id} ${match[1]} expected $${expected} got $${actual}`)
    }
  }

  // Check for duplicate reward bonuses per user per rank
  const rewardIdx = new Map()
  for (const b of rewardBonuses) {
    const k = `${b.user_id}|${(b.remarks||'').replace('Rank Achievement: ','')}`
    if (!rewardIdx.has(k)) rewardIdx.set(k, 0)
    rewardIdx.set(k, rewardIdx.get(k) + 1)
  }
  let dupRank = 0
  for (const [k, cnt] of rewardIdx) {
    if (cnt > 1) { dupRank += cnt - 1; report('❌', `DUPLICATE reward: ${k} × ${cnt}`) }
  }

  console.log(`  Total reward bonuses: ${rewardBonuses.length} | Wrong amounts: ${wrong} | Duplicates: ${dupRank}`)
  if (wrong === 0 && dupRank === 0) console.log('  ✅ All rank reward bonuses correct')
}

// ── SECTION 5: Royalty Income ──────────────────────────────────
async function auditRoyalty(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 5: ROYALTY INCOME')
  console.log('══════════════════════════════════════════════════════')

  const { royaltyBonuses } = data
  console.log(`  Total royalty bonus records: ${royaltyBonuses.length}`)

  // Royalty is monthly — group by user+month
  const royIdx = new Map()
  for (const b of royaltyBonuses) {
    const month = toIST(b.created_at).slice(0, 7) // YYYY-MM
    const k = `${b.user_id}|${month}`
    if (!royIdx.has(k)) royIdx.set(k, 0)
    royIdx.set(k, royIdx.get(k) + 1)
  }
  let dupRoyalty = 0
  for (const [k, cnt] of royIdx) {
    if (cnt > 1) { dupRoyalty += cnt - 1; report('❌', `DUPLICATE royalty: user|month=${k} × ${cnt}`) }
  }

  if (royaltyBonuses.length === 0) console.log('  ℹ️  No royalty distributions yet (monthly, runs on 1st)')
  else if (dupRoyalty === 0) console.log('  ✅ No duplicate royalty bonuses found')
}

// ── SECTION 6: Wallet Balance Integrity ───────────────────────
async function auditWalletBalances(data) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(' SECTION 6: WALLET BALANCE INTEGRITY')
  console.log('══════════════════════════════════════════════════════')

  const { users, ledger } = data

  // Group ledger by user
  const ledgerByUser = new Map()
  for (const l of ledger) {
    if (!ledgerByUser.has(l.user_id)) ledgerByUser.set(l.user_id, [])
    ledgerByUser.get(l.user_id).push(l)
  }

  let mismatch = 0
  for (const user of users) {
    const entries = ledgerByUser.get(user.id) || []
    const computed = entries.reduce((sum, e) => {
      return e.type === 'credit' ? sum + parseFloat(e.amount) : sum - parseFloat(e.amount)
    }, 0)
    const actual = parseFloat(user.income_wallet_balance)
    if (Math.abs(computed - actual) > 0.05) {
      mismatch++
      report('❌', `WALLET MISMATCH: ${user.user_id} (${user.name}) — ledger sum $${round2(computed)} vs actual $${actual} (diff $${round2(actual - computed)})`)
    }
  }

  if (mismatch === 0) console.log('  ✅ All wallet balances match ledger totals')
  else console.log(`  Wallet mismatches found: ${mismatch}`)
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(58)}`)
  console.log(` MASTER INCOME AUDIT — ${new Date().toISOString()}`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE FIX'} | Section: ${SECTION}`)
  console.log(`${'═'.repeat(58)}\n`)

  console.log('⏳ Bulk loading data (5 queries)...')
  const [users, packages, allBonuses, distributions, ledger] = await Promise.all([
    prisma.user.findMany({ select: { id: true, user_id: true, name: true, status: true, sponsor_id: true, income_wallet_balance: true } }),
    prisma.tradePackage.findMany({ select: { id: true, user_id: true, amount: true, status: true, started_at: true, total_earned: true, max_return: true, daily_roi_percent: true } }),
    prisma.bonus.findMany({ select: { id: true, user_id: true, from_user_id: true, type: true, level: true, amount: true, remarks: true, is_matured: true, created_at: true }, orderBy: { id: 'asc' } }),
    prisma.roiDistribution.findMany({ select: { id: true, package_id: true, user_id: true, amount: true, created_at: true }, orderBy: { id: 'asc' } }),
    prisma.incomeLedger.findMany({ select: { id: true, user_id: true, type: true, amount: true, created_at: true } }),
  ])

  const activePkgSet   = new Set(packages.filter(p => p.status === 'active').map(p => p.user_id))
  const downlineCount  = new Map()
  for (const u of users) {
    if (u.sponsor_id && activePkgSet.has(u.id)) {
      downlineCount.set(u.sponsor_id, (downlineCount.get(u.sponsor_id) || 0) + 1)
    }
  }

  const tradingBonuses = allBonuses.filter(b => b.type === 'trading')
  const directBonuses  = allBonuses.filter(b => b.type === 'direct')
  const levelBonuses   = allBonuses.filter(b => b.type === 'level')
  const rewardBonuses  = allBonuses.filter(b => b.type === 'reward')
  const royaltyBonuses = allBonuses.filter(b => b.type === 'royalty')

  console.log(`✅ Loaded: ${users.length} users | ${packages.length} packages | ${distributions.length} ROI dists | ${allBonuses.length} total bonuses | ${ledger.length} ledger entries`)
  console.log(`   Bonus breakdown — trading:${tradingBonuses.length} direct:${directBonuses.length} level:${levelBonuses.length} reward:${rewardBonuses.length} royalty:${royaltyBonuses.length}`)

  const data = { users, packages, allBonuses, distributions, ledger, tradingBonuses, directBonuses, levelBonuses, rewardBonuses, royaltyBonuses, activePkgSet, downlineCount }

  if (SECTION === 'all' || SECTION === 'roi')     await auditROI(data)
  if (SECTION === 'all' || SECTION === 'direct')  await auditDirect(data)
  if (SECTION === 'all' || SECTION === 'level')   await auditLevel(data)
  if (SECTION === 'all' || SECTION === 'reward')  await auditReward(data)
  if (SECTION === 'all' || SECTION === 'royalty') await auditRoyalty(data)
  if (SECTION === 'all')                          await auditWalletBalances(data)

  // ── Final Summary ───────────────────────────────────────────
  console.log(`\n${'═'.repeat(58)}`)
  console.log(' AUDIT COMPLETE')
  console.log(`${'═'.repeat(58)}`)
  console.log(` Total issues found : ${issues.length}`)
  if (!DRY_RUN) {
    console.log(` Fixes applied      : ${fixes}`)
    console.log(` Errors             : ${errors}`)
  }

  if (issues.length === 0) {
    console.log('\n ✅ CLEAN — all income records are correct.')
  } else {
    console.log('\n Issues by type:')
    const tags = {}
    for (const i of issues) { tags[i.tag] = (tags[i.tag]||0)+1 }
    for (const [t, c] of Object.entries(tags)) console.log(`   ${t}: ${c}`)
    if (DRY_RUN) {
      console.log('\n ℹ️  DRY RUN — no data written.')
      console.log(' To fix: DRY_RUN=false node scripts/master_audit.js')
      console.log(' Sections: SECTION=roi|direct|level|reward|royalty DRY_RUN=false node scripts/master_audit.js')
    }
  }
  console.log(`${'═'.repeat(58)}\n`)

  await prisma.$disconnect()
}

main().catch(async e => { console.error('Fatal:', e); await prisma.$disconnect(); process.exit(1) })
