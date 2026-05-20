const prisma = require('../lib/prisma');

async function testPerformance() {
  const activePackages = await prisma.tradePackage.findMany({
    where: { status: 'active' },
  });
  
  console.log(`Testing ${activePackages.length} packages`);
  const start = Date.now();
  
  for (const pkg of activePackages) {
    const pkgStart = new Date(pkg.started_at);
    const limit15Days = new Date(pkgStart.getTime() + 15 * 24 * 60 * 60 * 1000);
    
    await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE sponsor_id = ${pkg.user_id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree) AND started_at <= ${limit15Days}
    `;
  }
  
  const end = Date.now();
  console.log(`Time taken: ${end - start} ms`);
}

testPerformance().catch(console.error).finally(() => process.exit());
