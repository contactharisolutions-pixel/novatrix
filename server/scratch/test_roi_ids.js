const prisma = require('../lib/prisma');

async function testRoi() {
  const activePackages = await prisma.tradePackage.findMany({
    where: { status: 'active' },
  });

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + IST_OFFSET_MS);
  const todayStr = todayIST.toISOString().split('T')[0];

  for (const pkg of activePackages) {
    const alreadyRan = await prisma.roiDistribution.findFirst({
      where: {
        package_id: pkg.id,
        created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
      }
    });

    if (alreadyRan) continue;

    console.log(`Would process pkg #${pkg.id}`);
  }
}

testRoi().catch(console.error).finally(() => process.exit());
