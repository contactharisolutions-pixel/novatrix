require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const IST = 5.5 * 60 * 60 * 1000
  const toIST = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]

  // Load everything
  const [dists, users, activePkgs, allBonuses] = await Promise.all([
    p.roiDistribution.findMany({
      select: { id: true, amount: true, created_at: true,
        package: { select: { user: { select: { id: true, user_id: true, sponsor_id: true } } } }
      }, orderBy: { id: 'asc' }
    }),
    p.user.findMany({ select: { id: true, user_id: true, name: true, sponsor_id: true, status: true } }),
    p.tradePackage.findMany({ where: { status: 'active' }, select: { user_id: true } }),
    p.bonus.findMany({ where: { type: 'level' },
      select: { id: true, user_id: true, from_user_id: true, level: true, amount: true, created_at: true }
    })
  ])

  const uById = new Map(users.map(u => [u.id, u]))
  const withPkg = new Set(activePkgs.map(p => p.user_id))
  const downlineCount = new Map()
  for (const u of users) {
    if (u.sponsor_id && withPkg.has(u.id)) {
      downlineCount.set(u.sponsor_id, (downlineCount.get(u.sponsor_id) || 0) + 1)
    }
  }

  const totalROI = dists.reduce((s,d) => s + parseFloat(d.amount), 0)
  const lvlTotal = {}
  for (const b of allBonuses) {
    lvlTotal[b.level] = (lvlTotal[b.level] || 0) + parseFloat(b.amount)
  }

  console.log('\n=== ROI and Level Income Summary ===')
  console.log('Total ROI distributed :', totalROI.toFixed(2))
  for (const [lvl, total] of Object.entries(lvlTotal).sort((a,b) => +a[0] - +b[0])) {
    console.log('Level ' + lvl + ' total: $' + total.toFixed(2))
  }

  // Count eligible sponsor positions per level across all ROI dists
  const RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]
  const eligibleByLevel = {}
  const expectedByLevel = {}

  let distsWithSponsor = 0
  for (const d of dists) {
    const member = d.package.user
    if (!member.sponsor_id) continue
    distsWithSponsor++

    let level = 1
    let currId = member.id
    while (level <= 15) {
      const u = uById.get(currId)
      if (!u?.sponsor_id) break
      const sponsorId = u.sponsor_id
      currId = sponsorId
      const sponsor = uById.get(sponsorId)
      if (!sponsor) break

      const eligible = sponsor.status === 'active' && withPkg.has(sponsorId) && (downlineCount.get(sponsorId) || 0) >= level
      if (eligible) {
        const rate = RATES[level] || 0
        const expected = parseFloat((parseFloat(d.amount) * rate / 100).toFixed(2))
        eligibleByLevel[level] = (eligibleByLevel[level] || 0) + 1
        expectedByLevel[level] = (expectedByLevel[level] || 0) + expected
      }
      level++
    }
  }

  console.log('\n=== Expected vs Actual (current eligibility) ===')
  console.log('(NOTE: eligibility uses CURRENT active packages, not historical)')
  for (let lvl = 1; lvl <= 15; lvl++) {
    const expected = expectedByLevel[lvl] || 0
    const actual   = lvlTotal[lvl] || 0
    if (expected > 0 || actual > 0) {
      const diff = actual - expected
      const status = Math.abs(diff) < 0.01 ? '✅' : (diff > 0 ? '⬆️  OVERPAID' : '⬇️  UNDERPAID')
      console.log('  Level ' + String(lvl).padStart(2) + ': expected $' + expected.toFixed(2) + ' | actual $' + actual.toFixed(2) + ' | diff $' + diff.toFixed(2) + ' ' + status)
    }
  }

  // Check: distributions with a sponsor that paid ZERO level bonuses
  const bonusFromMember = new Map()
  for (const b of allBonuses) {
    const key = b.from_user_id + '|' + toIST(b.created_at)
    if (!bonusFromMember.has(key)) bonusFromMember.set(key, 0)
    bonusFromMember.set(key, bonusFromMember.get(key) + 1)
  }

  console.log('\n=== Distributions with sponsor but ZERO level bonuses paid ===')
  let zeroBonusDists = 0
  for (const d of dists) {
    const member = d.package.user
    if (!member.sponsor_id) continue
    const key = member.id + '|' + toIST(d.created_at)
    if (!bonusFromMember.has(key)) {
      zeroBonusDists++
      const sponsor = uById.get(member.sponsor_id)
      console.log('  Dist #' + d.id + ' | ' + toIST(d.created_at) + ' | member ' + member.user_id + ' | sponsor ' + (sponsor?.user_id || '?'))
    }
  }
  if (zeroBonusDists === 0) console.log('  None — all distributions triggered at least level-1 bonus ✅')

  console.log('\nDists checked:', dists.length, '| Dists with sponsor:', distsWithSponsor)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
