const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const p = await prisma.tradePackage.findUnique({
    where: { id: 1 },
    include: { roi_distributions: { orderBy: { created_at: 'desc' }, take: 5 } }
  });
  console.log(`Package #1 total_earned: ${p.total_earned}`);
  console.log(`Recent distributions:`);
  p.roi_distributions.forEach(r => console.log(r.created_at, r.amount));
  await prisma.$disconnect();
}
run();
