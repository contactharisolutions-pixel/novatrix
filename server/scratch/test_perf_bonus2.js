const prisma = require('../lib/prisma');
const { triggerROIMatchingBonus } = require('../services/bonusEngine');

async function testPerformance() {
  const activePackages = await prisma.tradePackage.findMany({
    where: { status: 'active' },
  });
  
  console.log(`Testing ${activePackages.length} packages (ROI Matching Bonus)`);
  const start = Date.now();
  
  for (const pkg of activePackages) {
    await triggerROIMatchingBonus(pkg.user_id, 'Member', 1.0);
  }
  
  const end = Date.now();
  console.log(`Time taken: ${end - start} ms`);
}

testPerformance().catch(console.error).finally(() => process.exit());
