const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function generateUniqueUserId() {
  while (true) {
    const id = Math.floor(100000 + Math.random() * 900000).toString()
    const exists = await prisma.user.findUnique({ where: { user_id: id } })
    if (!exists) return id
  }
}

async function run() {
  const members = [
    { name: 'Jay Shree Krishna 01', email: 'jsk1@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 02', email: 'jsk2@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 03', email: 'jsk3@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 04', email: 'jsk4@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 05', email: 'jsk5@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 06', email: 'jsk6@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 07', email: 'jsk7@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 08', email: 'jsk8@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
    { name: 'Jay Shree Krishna 09', email: 'jsk9@gmail.com', phone: '+919999999999', password: 'jsk@1234' },
  ]

  for (const m of members) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email: m.email } })
      if (existing) {
        console.log(`User ${m.email} already exists. Skipping...`)
        continue
      }

      const user_id = await generateUniqueUserId()
      const referral_code = String(user_id)
      const password_hash = await bcrypt.hash(m.password, 10)

      await prisma.user.create({
        data: {
          user_id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          password_hash,
          referral_code,
          status: 'inactive'
        }
      })
      console.log(`Successfully registered ${m.name} (${m.email}) with User ID: ${user_id}`)
    } catch (err) {
      console.error(`Failed to register ${m.email}:`, err.message)
    }
  }

  await prisma.$disconnect()
}

run()
