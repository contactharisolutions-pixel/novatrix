require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  // Direct downlines of 792322 (id=19, L1 sponsor of 682686)
  const dl = await p.user.findMany({
    where: { sponsor_id: 19 },
    select: { id: true, user_id: true, name: true, status: true, packages: { where: { status: 'active' }, select: { id: true } } }
  })
  console.log('Direct downlines of 792322 (id=19, sponsor of 682686):')
  for (const d of dl) console.log(' ', d.user_id, d.name, '| status:', d.status, '| active pkgs:', d.packages.length)

  // Active downline count for 138541 (id=18)
  const u = await p.user.findUnique({
    where: { id: 18 },
    select: { id: true, user_id: true, _count: { select: { referrals: { where: { packages: { some: { status: 'active' } } } } } } }
  })
  console.log('\nActive direct downline count for 138541 (id=18):', u._count.referrals, '(need 2 for L2)')

  // Also check: when did 138541 get its second active downline?
  const pkgs = await p.tradePackage.findMany({
    where: { user: { sponsor_id: 18 } },
    include: { user: { select: { user_id: true, name: true } } },
    orderBy: { started_at: 'asc' }
  })
  console.log('\nPackages from direct downlines of 138541 (id=18):')
  for (const pk of pkgs) {
    console.log(' ', pk.user.user_id, pk.user.name, '| pkg #' + pk.id + ' | status:', pk.status, '| started:', pk.started_at.toISOString().split('T')[0])
  }

  // ROI distributions for 682686 (id=20)
  const dists = await p.roiDistribution.findMany({
    where: { user_id: 20 },
    orderBy: { created_at: 'asc' }
  })
  console.log('\nROI distributions for 682686 (id=20):')
  for (const d of dists) console.log('  Dist #' + d.id + ' | ' + d.created_at.toISOString().split('T')[0])
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
