const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHistory() {
  console.log('ROI Distribution History (Last 10 days):');

  try {
    const distributions = await prisma.roiDistribution.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      select: { created_at: true }
    });

    const groups = {};
    distributions.forEach(d => {
      const date = d.created_at.toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + 1;
    });

    Object.keys(groups).sort().reverse().forEach(date => {
      console.log(`${date}: ${groups[date]} distributions`);
    });

  } catch (error) {
    console.error('History check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
