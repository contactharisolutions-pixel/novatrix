const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: '682686' }
    })
    if (user) {
      console.log('✅ User found:', user.name, user.email)
    } else {
      console.log('❌ User 682686 NOT found in database.')
    }
  } catch (err) {
    console.error('❌ Error connecting to database:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser()
