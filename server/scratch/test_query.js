const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const sponsor = await prisma.user.findUnique({
    where: { id: 1 },
    select: {
      sponsor_id: true,
      status: true,
      packages: {
        where: { status: 'active' },
        take: 1,
        select: { id: true }
      },
      _count: {
        select: {
          referrals: {
            where: { packages: { some: { status: 'active' } } }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(sponsor, null, 2));
  await prisma.$disconnect();
}
test();
