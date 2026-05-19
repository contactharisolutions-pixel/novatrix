require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const IST = 5.5 * 60 * 60 * 1000
  const toIST = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]

  // ── Focus on member 138541 and sponsor 747963 ──────────────────
  const member138541 = await p.user.findFirst({
    where: { user_id: '138541' },
    select: { id: true, user_id: true, name: true, sponsor_id: true, status: true }
  })
  console.log('\nMember 138541:', JSON.stringify(member138541))

  const sponsor747963 = await p.user.findFirst({
    where: { user_id: '747963' },
    select: {
      id: true, user_id: true, name: true, status: true, sponsor_id: true,
      packages: { select: { id: true, status: true, amount: true } },
      _count: { select: { referrals: true } }
    }
  })
  console.log('\nSponsor 747963:', JSON.stringify(sponsor747963, null, 2))

  // Active direct downlines of sponsor 747963
  const downlines747963 = await p.user.findMany({
    where: { sponsor_id: sponsor747963.id },
    select: {
      id: true, user_id: true, name: true, status: true,
      packages: { where: { status: 'active' }, select: { id: true } }
    }
  })
  console.log('\nDirect downlines of 747963:')
  for (const d of downlines747963) {
    console.log('  ', d.user_id, d.name, '| status:', d.status, '| active pkgs:', d.packages.length)
  }

  // ── Distributions for member 138541 (pkg 15) ──────────────────
  const dists138541 = await p.roiDistribution.findMany({
    where: { user_id: member138541.id },
    orderBy: { created_at: 'asc' }
  })
  console.log('\nROI distributions for 138541:')
  for (const d of dists138541) {
    console.log('  Dist #' + d.id + ' | ' + toIST(d.created_at) + ' | $' + d.amount)
  }

  // Level bonuses FROM 138541
  const lvlFrom138541 = await p.bonus.findMany({
    where: { from_user_id: member138541.id, type: 'level' },
    include: { user: { select: { user_id: true, name: true } } },
    orderBy: { created_at: 'asc' }
  })
  console.log('\nLevel bonuses triggered FROM member 138541 (i.e. paid to their upline):')
  for (const b of lvlFrom138541) {
    console.log('  Bonus #' + b.id + ' | ' + toIST(b.created_at) + ' | Level ' + b.level + ' | $' + b.amount + ' → ' + b.user.user_id + ' ' + b.user.name)
  }

  // ── Check overpaid Level 1 — find all L1 bonuses and verify ──
  const l1bonuses = await p.bonus.findMany({
    where: { type: 'level', level: 1 },
    include: {
      user: { select: { id: true, user_id: true, name: true } },
      from_user: { select: { id: true, user_id: true, sponsor_id: true } }
    },
    orderBy: { created_at: 'asc' }
  })

  const RATES = [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5]
  console.log('\n=== Level 1 bonus analysis ===')
  console.log('Total L1 bonuses:', l1bonuses.length)

  // For each L1 bonus, check if the from_user's sponsor IS that bonus user
  let overpaid = []
  for (const b of l1bonuses) {
    if (!b.from_user) { console.log('  Bonus #' + b.id + ' has no from_user — ORPHAN'); continue }
    if (b.from_user.sponsor_id !== b.user.id) {
      console.log('  ❌ L1 Bonus #' + b.id + ': from_user ' + b.from_user.user_id + ' sponsor_id=' + b.from_user.sponsor_id + ' but credited to ' + b.user.user_id + ' (id=' + b.user.id + ') — MISMATCH')
      overpaid.push(b)
    }
  }
  if (overpaid.length === 0) console.log('  ✅ All L1 bonuses credited to correct sponsor')

  // ── Check underpaid Level 2 ───────────────────────────────────
  console.log('\n=== Level 2 underpaid — finding gaps ===')
  // Get all ROI dists + expected L2 amounts
  const allDists = await p.roiDistribution.findMany({
    select: { id: true, amount: true, created_at: true,
      package: { select: { user: { select: { id: true, user_id: true, sponsor_id: true } } } }
    }, orderBy: { id: 'asc' }
  })
  const users = await p.user.findMany({ select: { id: true, user_id: true, name: true, sponsor_id: true, status: true } })
  const uById = new Map(users.map(u => [u.id, u]))
  const activePkgs = await p.tradePackage.findMany({ where: { status: 'active' }, select: { user_id: true } })
  const withPkg = new Set(activePkgs.map(pk => pk.user_id))
  const downlineCnt = new Map()
  for (const u of users) {
    if (u.sponsor_id && withPkg.has(u.id)) {
      downlineCnt.set(u.sponsor_id, (downlineCnt.get(u.sponsor_id) || 0) + 1)
    }
  }
  const l2bonuses = await p.bonus.findMany({
    where: { type: 'level', level: 2 },
    select: { id: true, user_id: true, from_user_id: true, amount: true, created_at: true }
  })
  const l2Index = new Map()
  for (const b of l2bonuses) {
    const k = b.user_id + '|' + b.from_user_id + '|' + toIST(b.created_at)
    if (!l2Index.has(k)) l2Index.set(k, [])
    l2Index.get(k).push(b)
  }

  for (const d of allDists) {
    const member = d.package.user
    // Level 2 sponsor = grandparent
    const directSponsor = uById.get(member.sponsor_id)
    if (!directSponsor?.sponsor_id) continue
    const l2SponsorId = directSponsor.sponsor_id
    const l2Sponsor = uById.get(l2SponsorId)
    if (!l2Sponsor) continue

    const eligible = l2Sponsor.status === 'active' && withPkg.has(l2SponsorId) && (downlineCnt.get(l2SponsorId) || 0) >= 2
    if (!eligible) continue

    const expected = parseFloat((parseFloat(d.amount) * RATES[2] / 100).toFixed(2))
    const k = l2SponsorId + '|' + member.id + '|' + toIST(d.created_at)
    const existing = l2Index.get(k) || []
    if (existing.length === 0) {
      console.log('  ⚠️  MISSING L2 | Dist #' + d.id + ' | ' + toIST(d.created_at) + ' | member ' + member.user_id + ' → L2 sponsor ' + l2Sponsor.user_id + ' | expected $' + expected)
    } else {
      const actual = parseFloat(existing[0].amount)
      if (Math.abs(actual - expected) > 0.005) {
        console.log('  ❌ WRONG L2 | Dist #' + d.id + ' | ' + toIST(d.created_at) + ' | expected $' + expected + ' | got $' + actual)
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
