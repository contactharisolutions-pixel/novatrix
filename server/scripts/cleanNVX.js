const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      referral_code: {
        startsWith: 'NVX'
      }
    }
  })

  let count = 0;
  for (const user of users) {
    if (user.referral_code && user.referral_code.startsWith('NVX')) {
      const newRefCode = user.referral_code.replace('NVX', '')
      await prisma.user.update({
        where: { id: user.id },
        data: { referral_code: newRefCode }
      })
      count++;
    }
  }

  console.log(`Successfully removed NVX from ${count} users' referral codes.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
