const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const hashedPassword = await bcrypt.hash('Life@20242526', 10);
  await prisma.admin.create({
    data: {
      name: 'Super Admin',
      email: 'admin@novatrix.vip',
      password_hash: hashedPassword,
      role: 'superadmin',
      is_active: true
    }
  });
  console.log('Admin user created successfully.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
