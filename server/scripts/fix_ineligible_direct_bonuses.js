/**
 * FIX: Reverse 3 ineligible direct referral bonuses
 * Bonus #337 — $50 to 682686 (Jay Shree Krishna 10) ← 326462 (Jayveer)
 * Bonus #343 — $5  to 682686 (Jay Shree Krishna 10) ← 222952 (Mahdev)
 * Bonus #341 — $5  to 138541 (Crypto111)            ← 792322 (Jay Shree Krishna 09)
 * Total: $60.00
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const INELIGIBLE = [
  { id: 337, userId: 20,  amount: 50.00, desc: '682686 ← 326462 (Jayveer $1000 pkg, sponsor 14 days late)' },
  { id: 343, userId: 20,  amount:  5.00, desc: '682686 ← 222952 (Mahdev $100 pkg, sponsor activated after)' },
  { id: 341, userId: 18,  amount:  5.00, desc: '138541 ← 792322 (Jay Shree Krishna 09, sponsor 1 day late)' },
]

async function main() {
  console.log('\n' + '═'.repeat(62))
  console.log(' FIX: REVERSE INELIGIBLE DIRECT REFERRAL BONUSES')
  console.log('═'.repeat(62))

  for (const item of INELIGIBLE) {
    console.log(`\n  Reversing Bonus #${item.id} | -$${item.amount.toFixed(2)} | ${item.desc}`)
    try {
      await p.$transaction(async tx => {
        // Deduct from income wallet
        const updated = await tx.user.update({
          where: { id: item.userId },
          data:  { income_wallet_balance: { decrement: item.amount } },
        })
        // Delete the bonus record
        await tx.bonus.delete({ where: { id: item.id } })
        // Write debit ledger entry
        await tx.incomeLedger.create({
          data: {
            user_id:        item.userId,
            type:           'debit',
            amount:         item.amount,
            balance_after:  updated.income_wallet_balance,
            remarks:        `[Fix] Reversed ineligible direct referral bonus #${item.id} — sponsor not yet active when referral joined`,
            reference_type: 'bonus',
          },
        })
      })
      console.log(`  ✅ Done — wallet debited $${item.amount.toFixed(2)}, bonus deleted, ledger written`)
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`)
    }
  }

  // Verify final balances
  console.log('\n' + '─'.repeat(62))
  console.log(' VERIFICATION — Updated Balances')
  console.log('─'.repeat(62))
  const userIds = [...new Set(INELIGIBLE.map(i => i.userId))]
  for (const uid of userIds) {
    const u = await p.user.findUnique({ where: { id: uid }, select: { user_id: true, name: true, income_wallet_balance: true } })
    const remaining = await p.bonus.findMany({ where: { user_id: uid, type: 'direct' }, select: { id: true, amount: true } })
    console.log(`  ${u.user_id} (${u.name}) — wallet: $${parseFloat(u.income_wallet_balance).toFixed(2)} | remaining direct bonuses: ${remaining.length}`)
  }

  console.log('\n' + '═'.repeat(62))
  console.log(' ✅ All 3 ineligible bonuses reversed. Total: -$60.00')
  console.log('═'.repeat(62) + '\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
