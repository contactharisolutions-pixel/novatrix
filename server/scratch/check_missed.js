const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPackages() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + IST_OFFSET_MS);
  let yesterday = new Date(todayIST);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yestStart = new Date(yesterday);
  yestStart.setHours(0,0,0,0);
  const yestStartUTC = new Date(yestStart.getTime() - IST_OFFSET_MS);

  const yestEnd = new Date(todayIST);
  yestEnd.setHours(0,0,0,0);
  const yestEndUTC = new Date(yestEnd.getTime() - IST_OFFSET_MS);

  const missingYesterday = await prisma.$queryRaw`
    SELECT p.id, p.started_at, p.status, p.total_earned, u.user_id, p.amount
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

  console.log("Details of missed packages:");
  missingYesterday.forEach(p => {
    console.log(`Pkg #${p.id} (User ${p.user_id}): Amount=$${p.amount}, StartedAt=${p.started_at.toISOString()}, TotalEarned=$${p.total_earned}`);
  });

  await prisma.$disconnect();
}

checkPackages();
