const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday() {
  const targetDateStr = '2026-05-09'; // Today (Saturday)
  const startOfDay = new Date(targetDateStr + 'T00:00:00+05:30');

  console.log(`Checking for today: ${targetDateStr}`);

  try {
    const roiCount = await prisma.roiDistribution.count({
      where: { created_at: { gte: startOfDay } }
    });
    console.log(`ROI Distributions today: ${roiCount}`);

    const bonusCount = await prisma.bonus.count({
      where: { created_at: { gte: startOfDay }, type: 'level' }
    });
    console.log(`Level Income today: ${bonusCount}`);

    const latestRoi = await prisma.roiDistribution.findFirst({
        orderBy: { created_at: 'desc' }
    });
    if (latestRoi) {
        console.log(`Latest ROI was at: ${latestRoi.created_at.toISOString()}`);
    }

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkToday();
