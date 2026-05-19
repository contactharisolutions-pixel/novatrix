const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  // Distributions created after May 17 00:00 UTC
  const rs = await prisma.roiDistribution.groupBy({
    by: ['package_id'],
    _max: { created_at: true },
    where: { created_at: { gte: new Date('2026-05-17T00:00:00Z') } }
  });
  console.log(`Packages with ROI since May 17: ${rs.length}`);
  if (rs.length > 0) {
    console.log(`Example package:`, rs[0]);
  }
  await prisma.$disconnect();
}
run();
