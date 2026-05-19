const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJSK() {
  console.log('Checking JSK Accounts status:');

  try {
    const users = await prisma.user.findMany({
      where: { name: { contains: 'Jay Shree Krishna' } },
      select: { 
        user_id: true, 
        name: true, 
        status: true, 
        income_wallet_balance: true,
        packages: { where: { status: 'active' } }
      }
    });

    users.forEach(u => {
      console.log(`- ${u.user_id} (${u.name}): Status=${u.status}, Wallet=${u.income_wallet_balance}, Active Packages=${u.packages.length}`);
    });

  } catch (error) {
    console.error('JSK check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJSK();
