const prisma = require('../lib/prisma');

async function getCommissionRates() {
  return {
    direct: 5.0,
    levels: [0, 20, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5],
  };
}

async function triggerROIMatchingBonus(memberId, memberUserId, roiAmount) {
  const rates = await getCommissionRates();
  const LEVEL_RATES = rates.levels;

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST        = new Date(Date.now() + IST_OFFSET_MS);
  const todayStr      = nowIST.toISOString().split('T')[0];
  const dayStart      = new Date(todayStr + 'T00:00:00+05:30');
  const dayEnd        = new Date(todayStr + 'T23:59:59+05:30');

  let level = 1;

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { sponsor_id: true }
  });
  let sponsorId = member?.sponsor_id;

  while (level <= 15 && sponsorId) {
    const sponsor = await prisma.user.findUnique({
      where: { id: sponsorId },
      select: {
        sponsor_id: true,
        status: true,
        packages: {
          where: { status: 'active', started_at: { lte: new Date() } },
          take: 1,
          select: { id: true, started_at: true }
        },
        _count: {
          select: {
            referrals: {
              where: { packages: { some: { status: 'active', started_at: { lte: new Date() } } } }
            }
          }
        }
      }
    });

    if (!sponsor) break;

    const hasActivePkg        = sponsor.packages.length > 0;
    const activeDownlineCount = sponsor._count.referrals;

    if (sponsor.status === 'active' && hasActivePkg) {
      if (activeDownlineCount >= level) {
        const rate     = LEVEL_RATES[level] || 0;
        const bonusAmt = parseFloat((roiAmount * rate / 100).toFixed(2));
        if (bonusAmt > 0) {
          // just test the reads, skip writes for perf testing
        }
      }
    }

    sponsorId = sponsor.sponsor_id;
    level++;
  }
}

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
