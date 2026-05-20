require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const IST = 5.5 * 60 * 60 * 1000
  const toIST = dt => new Date(new Date(dt).getTime() + IST).toISOString().replace('T',' ').slice(0,19)

  // Find member 682686
  const member = await p.user.findFirst({
    where: { user_id: '682686' },
    select: { id: true, user_id: true, name: true, sponsor_id: true, status: true }
  })
  console.log('\nMember 682686:', JSON.stringify(member))

  // All direct bonuses credited TO 682686
  const directBonuses = await p.bonus.findMany({
    where: { user_id: member.id, type: 'direct' },
    include: { from_user: { select: { id: true, user_id: true, name: true } } },
    orderBy: { created_at: 'asc' }
  })
  console.log(`\nDirect bonuses credited TO 682686 (${directBonuses.length} records):`)
  for (const b of directBonuses) {
    console.log(`  Bonus #${b.id} | ${toIST(b.created_at)} | $${b.amount} | from: ${b.from_user?.user_id} (${b.from_user?.name})`)
  }

  // Now check: 682686 is the SPONSOR of whom?
  // Direct referral bonus = sponsor earns 5% when their referral activates a package
  const downlines = await p.user.findMany({
    where: { sponsor_id: member.id },
    select: {
      id: true, user_id: true, name: true, status: true,
      packages: { select: { id: true, amount: true, status: true, started_at: true }, orderBy: { started_at: 'asc' } }
    }
  })
  console.log(`\nDirect downlines of 682686 (members referred BY them):`)
  for (const d of downlines) {
    console.log(`  ${d.user_id} ${d.name} | status: ${d.status}`)
    for (const pk of d.packages) {
      const expected5pct = parseFloat(pk.amount) * 5 / 100
      console.log(`    pkg #${pk.id} $${pk.amount} | status:${pk.status} | started:${toIST(pk.started_at)} | 5% = $${expected5pct}`)
    }
  }

  // Who is the SPONSOR of 682686?
  if (member.sponsor_id) {
    const sponsor = await p.user.findUnique({
      where: { id: member.sponsor_id },
      select: { id: true, user_id: true, name: true }
    })
    console.log(`\nSponsor of 682686: ${sponsor.user_id} (${sponsor.name})`)
    // Direct bonuses paid FROM 682686 TO their sponsor
    const paidFromMe = await p.bonus.findMany({
      where: { from_user_id: member.id, type: 'direct' },
      orderBy: { created_at: 'asc' }
    })
    console.log(`Direct bonuses triggered FROM 682686 (to their sponsor ${sponsor.user_id}):`)
    for (const b of paidFromMe) {
      console.log(`  Bonus #${b.id} | ${toIST(b.created_at)} | $${b.amount} → user_id #${b.user_id}`)
    }
  }

  // What packages does 682686 have?
  const myPkgs = await p.tradePackage.findMany({
    where: { user_id: member.id },
    orderBy: { started_at: 'asc' }
  })
  console.log(`\nPackages owned by 682686:`)
  for (const pk of myPkgs) {
    const expected5pct = parseFloat(pk.amount) * 5 / 100
    console.log(`  pkg #${pk.id} $${pk.amount} status:${pk.status} started:${toIST(pk.started_at)} | 5%=$${expected5pct}`)
  }

  // Verify the $50 bonus specifically
  console.log('\n=== $50 BONUS VERIFICATION ===')
  const bonus50 = directBonuses.find(b => parseFloat(b.amount) === 50)
  if (bonus50) {
    console.log(`Bonus #${bonus50.id}: $50 credited to 682686 from user #${bonus50.from_user_id} (${bonus50.from_user?.user_id} - ${bonus50.from_user?.name})`)
    console.log(`Date: ${toIST(bonus50.created_at)}`)
    console.log(`This means: ${bonus50.from_user?.user_id} made an investment of $${50/0.05} = $1000`)
    // Find the triggering package
    const pkg1000 = await p.tradePackage.findFirst({
      where: { user_id: bonus50.from_user_id, amount: { gte: 990, lte: 1010 } },
      orderBy: { started_at: 'asc' }
    })
    if (pkg1000) {
      console.log(`Triggering package: #${pkg1000.id} $${pkg1000.amount} started ${toIST(pkg1000.started_at)} ✅`)
    } else {
      console.log(`❌ No $1000 package found for this user!`)
      const allPkgs = await p.tradePackage.findMany({ where: { user_id: bonus50.from_user_id } })
      console.log(`Their packages: ${allPkgs.map(pk => `#${pk.id} $${pk.amount}`).join(', ')}`)
    }
    // Is 682686 the actual SPONSOR of from_user?
    const fromUser = await p.user.findUnique({ where: { id: bonus50.from_user_id }, select: { sponsor_id: true, user_id: true } })
    const isSponsor = fromUser.sponsor_id === member.id
    console.log(`Is 682686 the actual sponsor of ${bonus50.from_user?.user_id}? ${isSponsor ? '✅ YES' : '❌ NO (sponsor_id=' + fromUser.sponsor_id + ')'}`)
  } else {
    console.log('No $50 bonus found in records')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
