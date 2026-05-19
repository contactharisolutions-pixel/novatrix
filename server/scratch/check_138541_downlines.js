require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Who are the direct downlines of 138541 (id=18)?
  const u = await p.user.findFirst({ where: { user_id: '138541' }, select: { id: true } })
  const dl = await p.user.findMany({
    where: { sponsor_id: u.id },
    select: {
      id: true, user_id: true, name: true, status: true,
      packages: { select: { id: true, status: true, started_at: true }, orderBy: { started_at: 'asc' } }
    },
    orderBy: { id: 'asc' }
  })
  console.log(`\nDirect downlines of 138541 (id=${u.id}):`)
  for (const d of dl) {
    console.log(`  ${d.user_id} ${d.name} | status: ${d.status}`)
    for (const pk of d.packages) {
      console.log(`    pkg #${pk.id} status:${pk.status} started:${pk.started_at.toISOString().split('T')[0]}`)
    }
  }
  console.log(`\nTotal direct downlines: ${dl.length}`)
  console.log(`Active direct downlines: ${dl.filter(d => d.packages.some(p => p.status === 'active')).length}`)
  console.log(`\nFor Level 3 → need ≥ 3 active downlines`)
  console.log(`For Level 4 → need ≥ 4 active downlines`)
  console.log(`\nConclusion: 138541 currently has ${dl.filter(d => d.packages.some(p => p.status === 'active')).length} active downlines`)
  console.log(`Was NOT eligible for L3/L4 in the past if < 3/4 existed at that time`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
