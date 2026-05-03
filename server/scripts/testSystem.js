const { distributeROI } = require('../services/roiCron');
const { triggerDirectAndLevelBonus } = require('../services/bonusEngine');
const prisma = require('../lib/prisma');

async function testSystem() {
  console.log('🧪 Testing System Triggers...');

  // 1. Trigger Referral Bonuses for all active packages (that don't have bonuses yet)
  console.log('🔗 Triggering referral bonuses for all packages...');
  const packages = await prisma.tradePackage.findMany({
    include: { user: true }
  });

  let bonusTriggers = 0;
  for (const pkg of packages) {
    // Check if bonuses already exist for this user from this source
    const bonusExists = await prisma.bonus.findFirst({
      where: { from_user_id: pkg.user_id, type: 'direct' }
    });
    
    if (!bonusExists && pkg.user.sponsor_id) {
      console.log(`Triggering bonuses for package ${pkg.id} (User: ${pkg.user.user_id})...`);
      await triggerDirectAndLevelBonus(pkg.user_id, parseFloat(pkg.amount));
      bonusTriggers++;
    }
  }
  console.log(`✅ Triggered referral bonuses for ${bonusTriggers} packages.`);

  // 2. Run Daily ROI Distribution
  console.log('💰 Running Daily ROI Distribution...');
  await distributeROI();

  console.log('✅ System test complete! Check the DB for ledger entries and bonuses.');
}

testSystem()
  .catch(e => {
    console.error('❌ System test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
