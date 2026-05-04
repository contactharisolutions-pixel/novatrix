const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding 100 members...');

  const password_hash = await bcrypt.hash('password123', 12);
  const users = [];

  // 1. Create a root sponsor if none exists
  let root = await prisma.user.findFirst({ where: { sponsor_id: null } });
  if (!root) {
    const rootId = '100001';
    root = await prisma.user.create({
      data: {
        user_id: rootId,
        name: 'Root Member',
        email: 'root@novatrix.vip',
        phone: '1234567890',
        password_hash,
        referral_code: `${rootId}`,
        status: 'active',
      }
    });
    console.log('✅ Created root member');
  }
  users.push(root);

  // 2. Create 99 more members in a tree structure
  for (let i = 2; i <= 100; i++) {
    const userIdNum = 100000 + i;
    const userIdStr = String(userIdNum);
    
    // Check if exists to avoid conflicts if re-running
    const existing = await prisma.user.findUnique({ where: { user_id: userIdStr } });
    if (existing) {
      users.push(existing);
      continue;
    }

    const sponsor = users[Math.floor(Math.random() * users.length)];

    const user = await prisma.user.create({
      data: {
        user_id: userIdStr,
        name: `Test Member ${i}`,
        email: `test${i}@novatrix.vip`,
        phone: `9990000${String(i).padStart(3, '0')}`,
        password_hash,
        referral_code: `${userIdStr}`,
        sponsor_id: sponsor.id,
        status: Math.random() > 0.2 ? 'active' : 'inactive',
      }
    });
    users.push(user);
    if (i % 20 === 0) console.log(`... created ${i} users`);
  }

  // 3. Add some trade packages to test ROI
  console.log('📈 Adding trade packages to some members...');
  const activeUsers = users.filter(u => u.status === 'active');
  let packageCount = 0;
  for (const user of activeUsers) {
    // Check if user already has packages
    const hasPkg = await prisma.tradePackage.findFirst({ where: { user_id: user.id } });
    if (hasPkg) continue;

    if (Math.random() > 0.4) {
      const amounts = [50, 100, 500, 1000, 5000];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      
      let dailyRoi = 0.5;
      if (amount >= 5000) dailyRoi = 2.0;
      else if (amount >= 500) dailyRoi = 1.0;

      await prisma.tradePackage.create({
        data: {
          user_id: user.id,
          amount,
          daily_roi_percent: dailyRoi,
          max_return: amount * 2,
          status: 'active',
          started_at: new Date(),
        }
      });
      packageCount++;
    }
  }

  console.log(`✅ Seeding complete! Created/Verified 100 users and added ${packageCount} new packages.`);
}

seed()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
