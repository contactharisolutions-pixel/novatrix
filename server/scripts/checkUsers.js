const prisma = require('../lib/prisma')
async function check() {
  const users = await prisma.user.findMany()
  console.log('Users found:', users.length)
  users.forEach(u => {
    console.log(`- ID: ${u.user_id}, Name: ${u.name}, Email: ${u.email}, Status: ${u.status}`)
  })
  await prisma.$disconnect()
}

check()
