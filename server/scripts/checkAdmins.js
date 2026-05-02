const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const admins = await prisma.admin.findMany()
  console.log('Admins found:', admins.length)
  admins.forEach(a => {
    console.log(`- Email: ${a.email}, Active: ${a.is_active}, Role: ${a.role}`)
  })
  await prisma.$disconnect()
}

check()
