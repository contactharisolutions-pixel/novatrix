const prisma = require('../lib/prisma');

async function countRoi() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + IST_OFFSET_MS);
  const todayStr = todayIST.toISOString().split('T')[0];

  const count = await prisma.roiDistribution.count({
    where: {
      created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
    }
  });

  console.log(`ROI distributions today: ${count}`);
}

countRoi().catch(console.error).finally(() => process.exit());
