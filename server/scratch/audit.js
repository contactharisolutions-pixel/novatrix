const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log("--- STARTING RAW SQL AUDIT ---");

  try {
    // 1. Wallet Mismatch
    const walletMismatches = await prisma.$queryRaw`
      SELECT 
        u.user_id, 
        u.income_wallet_balance, 
        (
          COALESCE(SUM(CASE WHEN l.type = 'credit' THEN l.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN l.type = 'debit' THEN l.amount ELSE 0 END), 0)
        ) AS expected_balance
      FROM "User" u
      LEFT JOIN "IncomeLedger" l ON u.id = l.user_id
      GROUP BY u.id
      HAVING ABS(u.income_wallet_balance - (
          COALESCE(SUM(CASE WHEN l.type = 'credit' THEN l.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN l.type = 'debit' THEN l.amount ELSE 0 END), 0)
      )) > 0.01;
    `;

    console.log(`Wallet Mismatches: ${walletMismatches.length}`);
    walletMismatches.forEach(m => console.log(`  -> User ${m.user_id}: DB=${m.income_wallet_balance}, Expected=${m.expected_balance}`));

    // 2. Package total_earned vs ROI distributions
    const packageMismatches = await prisma.$queryRaw`
      SELECT
        p.id, p.total_earned, COALESCE(SUM(r.amount), 0) as expected_earned
      FROM "TradePackage" p
      LEFT JOIN "RoiDistribution" r ON p.id = r.package_id
      GROUP BY p.id
      HAVING ABS(p.total_earned - COALESCE(SUM(r.amount), 0)) > 0.01;
    `;

    console.log(`\nROI total_earned Discrepancies: ${packageMismatches.length}`);
    packageMismatches.forEach(m => console.log(`  -> Pkg #${m.id}: DB=${m.total_earned}, Expected=${m.expected_earned}`));

    // 3. Check for missed yesterday's ROI
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + IST_OFFSET_MS);
    
    let yesterday = new Date(todayIST);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDay = yesterday.getDay(); // 0-6

    if (yesterdayDay >= 1 && yesterdayDay <= 5) {
      // Find start and end of yesterday in UTC (approx to match IST filtering)
      // Actually Prisma stores in UTC.
      // So yestStart UTC = yesterday 00:00 IST = yesterday 00:00 - 5.5 hours.
      const yestStart = new Date(yesterday);
      yestStart.setHours(0,0,0,0);
      const yestStartUTC = new Date(yestStart.getTime() - IST_OFFSET_MS);

      const yestEnd = new Date(todayIST);
      yestEnd.setHours(0,0,0,0);
      const yestEndUTC = new Date(yestEnd.getTime() - IST_OFFSET_MS);

      const missingYesterday = await prisma.$queryRaw`
        SELECT p.id, p.started_at, u.user_id
        FROM "TradePackage" p
        JOIN "User" u ON u.id = p.user_id
        WHERE p.status = 'active' 
          AND p.started_at < ${yestStartUTC}
          AND NOT EXISTS (
            SELECT 1 FROM "RoiDistribution" r 
            WHERE r.package_id = p.id 
              AND r.created_at >= ${yestStartUTC} 
              AND r.created_at < ${yestEndUTC}
          )
      `;

      console.log(`\nPackages missing yesterday's ROI: ${missingYesterday.length}`);
      missingYesterday.slice(0, 5).forEach(m => console.log(`  -> Pkg #${m.id} (User ${m.user_id})`));
      if (missingYesterday.length > 5) console.log(`  ... and ${missingYesterday.length - 5} more.`);
    } else {
      console.log(`\nYesterday was weekend, no daily ROI expected.`);
    }

    console.log("\n--- AUDIT COMPLETE ---");
  } catch (err) {
    console.error("Audit failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
