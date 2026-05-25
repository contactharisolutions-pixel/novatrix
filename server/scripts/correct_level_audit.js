/**
 * Correct Level Income Audit
 * Matches daily expected bonuses with actual bonuses on the same day (in IST)
 * using a greedy matching algorithm.
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

async function main() {
  console.log(`\n${'═'.repeat(65)}`)
  console.log(` CORRECT LEVEL INCOME AUDIT & CLASSIFICATION`)
  console.log(`${'═'.repeat(65)}\n`)

  const [users, allPackages, distributions, levelBonuses] = await Promise.all([
    p.user.findMany({ select: { id: true, user_id: true, name: true, status: true, sponsor_id: true } }),
    p.tradePackage.findMany({ select: { id: true, user_id: true, status: true, started_at: true, completed_at: true } }),
    p.roiDistribution.findMany({
      select: { id: true, user_id: true, amount: true, created_at: true, package_id: true },
      orderBy: { id: 'asc' }
    }),
    p.bonus.findMany({
      where: { type: 'level' },
      select: { id: true, user_id: true, from_user_id: true, level: true, amount: true, created_at: true, package_id: true }
    })
  ])

  const uById = new Map(users.map(u => [u.id, u]))

  const pkgsByUser = new Map()
  for (const pk of allPackages) {
    if (!pkgsByUser.has(pk.user_id)) pkgsByUser.set(pk.user_id, [])
    pkgsByUser.get(pk.user_id).push(pk)
  }

  // Active downlines helper
  function historicalDownlineCount(sponsorId, onDate) {
    let count = 0
    for (const u of users) {
      if (u.sponsor_id !== sponsorId) continue
      const pkgs = pkgsByUser.get(u.id) || []
      const hasActive = pkgs.some(p => new Date(p.started_at) <= onDate && (p.completed_at === null || new Date(p.completed_at) > onDate))
      if (hasActive) count++
    }
    return count
  }

  function wasActive(userId) {
    return uById.get(userId)?.status === 'active'
  }

  function hadActivePkgOn(userId, onDate) {
    const pkgs = pkgsByUser.get(userId) || []
    return pkgs.some(p => new Date(p.started_at) <= onDate && (p.completed_at === null || new Date(p.completed_at) > onDate))
  }

  const expectedList = []

  for (const dist of distributions) {
    const roiAmt = parseFloat(dist.amount)
    const distDate = toIST(dist.created_at)
    const distDt = new Date(dist.created_at)

    let currId = dist.user_id
    let level = 1

    while (level <= 15) {
      const u = uById.get(currId)
      if (!u?.sponsor_id) break
      const sponsorId = u.sponsor_id
      currId = sponsorId
      const sponsor = uById.get(sponsorId)
      if (!sponsor) break

      const rate = LEVEL_RATES[level] || 0
      const expected = round2(roiAmt * rate / 100)
      const eligible = wasActive(sponsorId) && hadActivePkgOn(sponsorId, distDt) && historicalDownlineCount(sponsorId, distDt) >= level

      if (eligible && expected > 0) {
        expectedList.push({
          sponsorId,
          memberId: dist.user_id,
          level,
          amount: expected,
          dateStr: distDate,
          distId: dist.id,
          packageId: dist.package_id
        })
      }
      level++
    }
  }

  const expectedGrouped = new Map()
  for (const exp of expectedList) {
    const key = `${exp.sponsorId}|${exp.memberId}|${exp.level}|${exp.dateStr}`
    if (!expectedGrouped.has(key)) expectedGrouped.set(key, [])
    expectedGrouped.get(key).push(exp)
  }

  const actualGrouped = new Map()
  for (const act of levelBonuses) {
    const dateStr = toIST(act.created_at)
    const key = `${act.user_id}|${act.from_user_id}|${act.level}|${dateStr}`
    if (!actualGrouped.has(key)) actualGrouped.set(key, [])
    actualGrouped.get(key).push({
      id: act.id,
      amount: parseFloat(act.amount),
      packageId: act.package_id,
      created_at: act.created_at,
      raw: act
    })
  }

  const allKeys = new Set([...expectedGrouped.keys(), ...actualGrouped.keys()])

  const blockedSponsorIssues = []
  const noActivePkgIssues = []
  const levelGateIssues = []
  const trueDuplicates = []
  const missingList = []
  const wrongList = []

  for (const key of allKeys) {
    const [spId, mbId, lvl, dateStr] = key.split('|').map((v, i) => i < 3 ? parseInt(v) : v)
    const expected = expectedGrouped.get(key) || []
    const actual = actualGrouped.get(key) || []

    const sponsor = uById.get(spId)
    const member = uById.get(mbId)

    const unmatchedExpected = []
    const unmatchedActual = [...actual]

    for (const exp of expected) {
      const matchIdx = unmatchedActual.findIndex(act => Math.abs(act.amount - exp.amount) < 0.005)
      if (matchIdx !== -1) {
        unmatchedActual.splice(matchIdx, 1)
      } else {
        unmatchedExpected.push(exp)
      }
    }

    // Check wrong amounts
    const wrongAmtPairs = []
    const finalUnmatchedExpected = []
    
    for (const exp of unmatchedExpected) {
      if (unmatchedActual.length > 0) {
        const act = unmatchedActual.shift()
        wrongAmtPairs.push({ expected: exp, actual: act })
      } else {
        finalUnmatchedExpected.push(exp)
      }
    }

    for (const pair of wrongAmtPairs) {
      wrongList.push({ sponsor, member, lvl, dateStr, ...pair })
    }

    for (const exp of finalUnmatchedExpected) {
      missingList.push({ sponsor, member, lvl, dateStr, ...exp })
    }

    // Classify unmatched actuals
    for (const act of unmatchedActual) {
      const distDt = new Date(act.created_at)
      
      // 1. Is sponsor blocked?
      if (sponsor?.status === 'blocked') {
        blockedSponsorIssues.push({ sponsor, member, lvl, dateStr, act })
        continue
      }
      
      // 2. Did sponsor lack active package at that time?
      if (!hadActivePkgOn(spId, distDt)) {
        noActivePkgIssues.push({ sponsor, member, lvl, dateStr, act })
        continue
      }
      
      // 3. Did sponsor fail level gate at that time?
      const dlCount = historicalDownlineCount(spId, distDt)
      if (dlCount < lvl) {
        levelGateIssues.push({ sponsor, member, lvl, dateStr, act, dlCount })
        continue
      }

      // 4. Otherwise, it is a duplicate of a matched or wrong amount payment on the same day
      trueDuplicates.push({ sponsor, member, lvl, dateStr, act })
    }
  }

  console.log('═'.repeat(65))
  console.log(' CLASSIFICATION RESULTS')
  console.log('═'.repeat(65))
  console.log(`Missing level bonuses           : ${missingList.length}`)
  console.log(`Wrong amount level bonuses      : ${wrongList.length}`)
  console.log(`Ineligible - Blocked Sponsor    : ${blockedSponsorIssues.length}`)
  console.log(`Ineligible - No Active Package  : ${noActivePkgIssues.length}`)
  console.log(`Ineligible - Level Gate Failed  : ${levelGateIssues.length}`)
  console.log(`True Duplicate payments         : ${trueDuplicates.length}`)
  console.log('═'.repeat(65))

  console.log('\n--- Ineligible due to Level Gate Failed ---')
  for (const issue of levelGateIssues) {
    console.log(`  Bonus #${issue.act.id} | $${issue.act.amount} | Date: ${issue.dateStr} | Level: ${issue.lvl} | Sponsor: ${issue.sponsor.user_id} | Member: ${issue.member.user_id} | Active downlines: ${issue.dlCount}`)
  }

  console.log('\n--- Ineligible due to No Active Package ---')
  for (const issue of noActivePkgIssues) {
    console.log(`  Bonus #${issue.act.id} | $${issue.act.amount} | Date: ${issue.dateStr} | Level: ${issue.lvl} | Sponsor: ${issue.sponsor.user_id} | Member: ${issue.member.user_id}`)
  }

  console.log('\n--- True Duplicates ---')
  for (const issue of trueDuplicates) {
    console.log(`  Bonus #${issue.act.id} | $${issue.act.amount} | Date: ${issue.dateStr} | Level: ${issue.lvl} | Sponsor: ${issue.sponsor.user_id} | Member: ${issue.member.user_id}`)
  }

  console.log('\n--- Blocked Sponsors (Currently blocked) ---')
  const uniqueBlocked = [...new Set(blockedSponsorIssues.map(i => i.sponsor.user_id))]
  console.log(`Total blocked sponsors receiving bonuses: ${uniqueBlocked.join(', ')}`)

  await p.$disconnect()
}

main().catch(console.error)
