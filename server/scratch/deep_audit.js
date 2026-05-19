const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAudit() {
  const targetDateStr = '2026-05-08'; // Yesterday (Friday)
  const startOfDay = new Date(targetDateStr + 'T00:00:00+05:30');
  const endOfDay = new Date(targetDateStr + 'T23:59:59+05:30');

  console.log(`Deep Matching Audit for: ${targetDateStr}`);

  try {
    const rois = await prisma.roiDistribution.findMany({
      where: { created_at: { gte: startOfDay, lte: endOfDay } },
      include: { package: { include: { user: { select: { user_id: true, name: true } } } } }
    });

    for (const roi of rois) {
      console.log(`\nROI for ${roi.package.user.user_id} (${roi.package.user.name})`);
      
      let currentId = roi.user_id;
      for (let level = 1; level <= 15; level++) {
        const u = await prisma.user.findUnique({
          where: { id: currentId },
          select: { sponsor_id: true }
        });
        if (!u?.sponsor_id) break;
        
        const sponsorId = u.sponsor_id;
        const sponsor = await prisma.user.findUnique({
          where: { id: sponsorId },
          include: { packages: { where: { status: 'active' } } }
        });

        // Check if this sponsor SHOULD have received a bonus
        const activeDownlineCount = await prisma.user.count({
          where: { sponsor_id: sponsorId, packages: { some: { status: 'active' } } }
        });

        const shouldReceive = sponsor.status === 'active' && sponsor.packages.length > 0 && activeDownlineCount >= level;

        if (shouldReceive) {
          // Check if they DID receive it
          const bonus = await prisma.bonus.findFirst({
            where: {
              user_id: sponsorId,
              from_user_id: roi.user_id,
              type: 'level',
              level: level,
              created_at: {
                gte: new Date(roi.created_at.getTime() - 1000),
                lte: new Date(roi.created_at.getTime() + 120000) // 2 min window
              }
            }
          });

          if (bonus) {
            console.log(` [✓] Level ${level}: Sponsor ${sponsor.user_id} received ${bonus.amount}`);
          } else {
            console.log(` [✗] Level ${level}: Sponsor ${sponsor.user_id} SHOULD have received bonus but NOT FOUND!`);
          }
        } else {
          // console.log(` [-] Level ${level}: Sponsor ${sponsor.user_id} not eligible.`);
        }
        
        currentId = sponsorId;
      }
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepAudit();
