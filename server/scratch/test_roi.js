const prisma = require('../lib/prisma');

async function testRoi() {
  const activePackages = await prisma.tradePackage.findMany({
    where: { status: 'active' },
  });

  console.log(`Found ${activePackages.length} active packages.`);

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + IST_OFFSET_MS);
  const todayStr = todayIST.toISOString().split('T')[0];

  let skippedAlready = 0;
  let skippedCreditable = 0;
  let wouldProcess = 0;

  for (const pkg of activePackages) {
    const alreadyRan = await prisma.roiDistribution.findFirst({
      where: {
        package_id: pkg.id,
        created_at: { gte: new Date(todayStr + 'T00:00:00+05:30') }
      }
    });

    if (alreadyRan) {
      skippedAlready++;
      continue;
    }

    const amount      = parseFloat(pkg.amount);
    const totalEarned = parseFloat(pkg.total_earned);
    const PLATFORM_LAUNCH = new Date('2026-05-04T00:00:00+05:30');
    const pkgStart        = new Date(pkg.started_at);
    
    const effectiveStart  = pkgStart < PLATFORM_LAUNCH ? PLATFORM_LAUNCH : pkgStart;
    
    const diffTime = effectiveStart.getTime() - PLATFORM_LAUNCH.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let dailyRoi = 0.5;
    if (diffDays <= 30) {
      dailyRoi = 2.0;
    } else if (diffDays <= 120) {
      dailyRoi = 1.0;
    } else {
      dailyRoi = 0.5;
    }

    const [firstPkg] = await prisma.$queryRaw`
      SELECT started_at FROM "TradePackage"
      WHERE user_id = ${pkg.user_id}
      ORDER BY started_at ASC LIMIT 1
    `;
    const memberActivationDate = firstPkg ? new Date(firstPkg.started_at) : pkgStart;
    const limit15Days = new Date(memberActivationDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const [memberInvestRes] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id = ${pkg.user_id} AND started_at <= ${limit15Days}
    `;
    const memberInvest15Days = parseFloat(memberInvestRes?.total || 0);

    const [teamInvestRes15Days] = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE sponsor_id = ${pkg.user_id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${limit15Days}
    `;
    const teamTotal15Days = parseFloat(teamInvestRes15Days?.total || 0);

    let maxMultiplier = 2;
    if (memberInvest15Days > 0 && teamTotal15Days >= 3 * memberInvest15Days) {
      maxMultiplier = 3;
    }

    const maxReturn = amount * maxMultiplier;
    const roiEarned = parseFloat((amount * dailyRoi / 100).toFixed(2));

    const creditable = Math.min(roiEarned, maxReturn - totalEarned);
    if (creditable <= 0) {
      skippedCreditable++;
      continue;
    }

    wouldProcess++;
  }

  console.log({ skippedAlready, skippedCreditable, wouldProcess });
}

testRoi().catch(console.error).finally(() => process.exit());
