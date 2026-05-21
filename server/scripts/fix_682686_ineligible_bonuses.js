/**
 * DATABASE FIX SCRIPT: Reverse ineligible Direct and Level bonuses for user 682686 (Jay Shree Krishna 10)
 * 
 * Target User: 682686 (DB ID: 20)
 * Earliest trade package activation: 2026-05-18T13:19:30.115Z (18:49:30 IST)
 * 
 * Run:
 *   DRY_RUN=true node scripts/fix_682686_ineligible_bonuses.js  (Default: report only)
 *   DRY_RUN=false node scripts/fix_682686_ineligible_bonuses.js (Apply database updates)
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'

async function main() {
  console.log('================================================================');
  console.log(` DATABASE FIX — REVERSE INELIGIBLE BONUSES FOR 682686`);
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN (No changes)' : '🚀 LIVE FIX (Modifying database)'}`);
  console.log('================================================================');

  const userId = 20; // DB ID of 682686
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { packages: true }
  });

  if (!user) {
    console.error('❌ User 682686 not found in database.');
    return;
  }

  // Earliest trade package activation
  const earliestPkg = user.packages.sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0];
  if (!earliestPkg) {
    console.error('❌ User 682686 has no packages in database.');
    return;
  }

  const activationDate = new Date(earliestPkg.started_at);
  console.log(`User ID: ${user.user_id} (${user.name})`);
  console.log(`Earliest package activated at: ${activationDate.toISOString()}`);
  console.log(`Current Income Wallet Balance : $${user.income_wallet_balance}`);

  // Fetch direct and level bonuses received before package activation
  const ineligibleBonuses = await prisma.bonus.findMany({
    where: {
      user_id: userId,
      type: { in: ['direct', 'level'] },
      created_at: { lt: activationDate }
    },
    include: {
      from_user: true
    },
    orderBy: { created_at: 'asc' }
  });

  console.log(`\nFound ${ineligibleBonuses.length} ineligible bonuses received before package activation:`);
  
  let totalAmount = 0;
  for (const b of ineligibleBonuses) {
    const amt = parseFloat(b.amount);
    totalAmount += amt;
    console.log(`  - Bonus #${b.id} | Type: ${b.type.padEnd(6)} | Lvl: ${b.level} | Amt: $${amt.toFixed(2)} | From: ${b.from_user?.user_id} | Created: ${b.created_at.toISOString()}`);
  }

  console.log(`\nTotal amount to reverse: $${totalAmount.toFixed(2)}`);

  if (ineligibleBonuses.length === 0) {
    console.log('✅ No ineligible bonuses found to reverse.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN: No changes were applied.');
    console.log('To apply the fix, run: DRY_RUN=false node scripts/fix_682686_ineligible_bonuses.js');
    return;
  }

  console.log('\n🚀 Executing live fix sequentially...');
  
  let currentBalance = parseFloat(user.income_wallet_balance);

  for (const b of ineligibleBonuses) {
    const amt = parseFloat(b.amount);
    currentBalance = currentBalance - amt;
    const remark = `[Fix] Reversal of ineligible ${b.type} bonus (level ${b.level}) from ${b.from_user?.user_id || 'unknown'} before sponsor activation`;
    
    // Delete the bonus record
    await prisma.bonus.delete({
      where: { id: b.id }
    });

    // Create ledger entry
    await prisma.incomeLedger.create({
      data: {
        user_id: userId,
        type: 'debit',
        amount: amt,
        balance_after: currentBalance,
        remarks: remark,
        reference_type: 'bonus',
        reference_id: b.id
      }
    });

    console.log(`  - Reverted Bonus #${b.id} ($${amt.toFixed(2)})`);
  }

  // Update user balance at the end to match currentBalance
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      income_wallet_balance: currentBalance
    }
  });

  console.log(`✅ User balance updated: $${user.income_wallet_balance} -> $${updatedUser.income_wallet_balance}`);
  console.log(`✅ Deleted ${ineligibleBonuses.length} bonus records and created debit ledger entries.`);

  console.log('✅ Reversal completed successfully.');
}

main()
  .catch(async e => {
    console.error('Fatal error during fix:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
