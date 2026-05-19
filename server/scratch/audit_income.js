const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  const targetDateStr = '2026-05-08';
  const startOfDay = new Date(targetDateStr + 'T00:00:00+05:30');
  const endOfDay = new Date(targetDateStr + 'T23:59:59+05:30');

  console.log(`Deep Level Income Audit for: ${targetDateStr}`);

  try {
    // 1. Get ROI distributions
    const rois = await prisma.roiDistribution.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      include: { package: { include: { user: { select: { user_id: true, name: true } } } } }
    });

    console.log(`Total ROI distributions: ${rois.length}`);

    for (const roi of rois) {
      console.log(`\nROI for ${roi.package.user.user_id} (${roi.package.user.name}) - Amount: ${roi.amount}`);
      
      // Get associated level bonuses
      const levelBonuses = await prisma.bonus.findMany({
        where: {
          from_user_id: roi.user_id,
          type: 'level',
          created_at: {
              // Level bonus might be created slightly after ROI
              gte: new Date(roi.created_at.getTime() - 1000), 
              lte: new Date(roi.created_at.getTime() + 60000) // 1 minute window
          }
        },
        include: { user: { select: { user_id: true, name: true } } }
      });

      if (levelBonuses.length === 0) {
        console.log(` [!] NO LEVEL BONUSES FOUND for this ROI.`);
        
        // Let's investigate the sponsor chain for this user
        let currentId = roi.user_id;
        console.log(` Investigating sponsor chain:`);
        for (let l = 1; l <= 3; l++) { // Check first 3 levels
            const u = await prisma.user.findUnique({
                where: { id: currentId },
                select: { sponsor_id: true }
            });
            if (!u?.sponsor_id) {
                console.log(`  Level ${l}: No sponsor.`);
                break;
            }
            const sponsor = await prisma.user.findUnique({
                where: { id: u.sponsor_id },
                include: { packages: { where: { status: 'active' } } }
            });
            
            const directActiveCount = await prisma.user.count({
                where: { sponsor_id: u.sponsor_id, packages: { some: { status: 'active' } } }
            });

            console.log(`  Level ${l}: Sponsor ${sponsor.user_id} (${sponsor.name}) - Status: ${sponsor.status}, Active Pkgs: ${sponsor.packages.length}, Direct Active Downline: ${directActiveCount}`);
            
            if (sponsor.status !== 'active') console.log(`    -> FAILED: Sponsor not active`);
            if (sponsor.packages.length === 0) console.log(`    -> FAILED: Sponsor has no active package`);
            if (directActiveCount < l) console.log(`    -> FAILED: Sponsor direct active downline (${directActiveCount}) < level (${l})`);
            
            currentId = u.sponsor_id;
        }
      } else {
        levelBonuses.forEach(lb => {
          console.log(` [✓] Level ${lb.level} bonus of ${lb.amount} to ${lb.user.user_id} (${lb.user.name})`);
        });
      }
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
