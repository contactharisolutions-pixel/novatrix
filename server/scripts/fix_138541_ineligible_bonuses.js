const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'

async function main() {
  const targetDisplayId = '138541'
  const user = await prisma.user.findFirst({
    where: { user_id: targetDisplayId },
    include: { packages: true }
  })

  if (!user) {
    console.error(`User ${targetDisplayId} not found`)
    return
  }

  const earliestPkg = user.packages.sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0]
  const activationDate = earliestPkg ? new Date(earliestPkg.started_at) : null

  if (!activationDate) {
    console.error(`User ${targetDisplayId} has no packages / activation date.`)
    return
  }

  console.log(`User ID: ${user.user_id} (${user.name})`)
  console.log(`Database User ID: ${user.id}`)
  console.log(`Earliest package activated at: ${activationDate.toISOString()}`)
  console.log(`Current Income Wallet Balance : $${user.income_wallet_balance}`)

  // Find all direct & level bonuses credited BEFORE activation date
  const ineligiblePreActivation = await prisma.bonus.findMany({
    where: {
      user_id: user.id,
      type: { in: ['direct', 'level'] },
      created_at: { lt: activationDate }
    },
    include: {
      from_user: true
    },
    orderBy: { created_at: 'asc' }
  })

  console.log(`\nFound ${ineligiblePreActivation.length} ineligible pre-activation bonuses:`)
  let totalAmount = 0
  for (const b of ineligiblePreActivation) {
    const amt = parseFloat(b.amount)
    totalAmount += amt
    console.log(`  - Bonus #${b.id} | Type: ${b.type.padEnd(6)} | Lvl: ${b.level} | Amt: $${amt.toFixed(2)} | From: ${b.from_user?.user_id} | Created: ${b.created_at.toISOString()}`)
  }

  console.log(`\nTotal amount to reverse: $${totalAmount.toFixed(2)}`)

  if (ineligiblePreActivation.length === 0) {
    console.log('✅ No ineligible pre-activation bonuses found to reverse.')
    return
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN: No changes were applied to the database. Run with DRY_RUN=false to execute.')
    return
  }

  console.log('\n🚀 Executing live reversal sequentially outside transaction to prevent Prisma timeouts...')
  let currentBalance = parseFloat(user.income_wallet_balance)

  for (const b of ineligiblePreActivation) {
    const amt = parseFloat(b.amount)
    currentBalance = currentBalance - amt
    const remark = `[Fix] Reversal of ineligible pre-activation ${b.type} bonus (level ${b.level}) from ${b.from_user?.user_id || 'unknown'} (created before activation date)`

    // Delete the bonus record
    await prisma.bonus.delete({ where: { id: b.id } })

    // Create a corresponding debit entry in the ledger
    await prisma.incomeLedger.create({
      data: {
        user_id: user.id,
        type: 'debit',
        amount: amt,
        balance_after: parseFloat(currentBalance.toFixed(4)),
        remarks: remark,
        reference_type: 'bonus',
        reference_id: b.id
      }
    })

    console.log(`  - Reverted Bonus #${b.id} ($${amt.toFixed(2)})`)
  }

  // Update user's wallet balance
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { income_wallet_balance: parseFloat(currentBalance.toFixed(4)) }
  })

  console.log(`\n✅ User balance updated: $${user.income_wallet_balance} -> $${updatedUser.income_wallet_balance}`)
  console.log(`✅ Completed successfully.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
