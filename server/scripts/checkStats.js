const prisma = require('../lib/prisma');

async function check() {
  const [userCount, pkgCount, bonusCount, roiCount, totalIncome] = await Promise.all([
    prisma.user.count(),
    prisma.tradePackage.count(),
    prisma.bonus.count(),
    prisma.roiDistribution.count(),
    prisma.user.aggregate({ _sum: { income_wallet_balance: true } })
  ]);

  console.log('--- System Stats ---');
  console.log('Total Users:', userCount);
  console.log('Total Packages:', pkgCount);
  console.log('Total Bonuses Given:', bonusCount);
  console.log('Total ROI Distributions:', roiCount);
  console.log('Total Income Wallet Balance:', totalIncome._sum.income_wallet_balance);
  console.log('--------------------');
}

check().catch(console.error).finally(() => prisma.$disconnect());
