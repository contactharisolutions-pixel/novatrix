const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'

async function main() {
  const userId = 20; // 682686
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { packages: true }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  // Load all users, packages, bonuses
  const [users, packages, bonuses] = await Promise.all([
    prisma.user.findMany({ select: { id: true, user_id: true, status: true, sponsor_id: true } }),
    prisma.tradePackage.findMany({ select: { id: true, user_id: true, started_at: true, completed_at: true } }),
    prisma.bonus.findMany({ 
      where: { user_id: userId, type: { in: ['direct', 'level'] } },
      include: { from_user: true },
      orderBy: { created_at: 'asc' }
    }),
  ]);

  const pkgsByUserId = new Map()
  for (const p of packages) {
    if (!pkgsByUserId.has(p.user_id)) pkgsByUserId.set(p.user_id, [])
    pkgsByUserId.get(p.user_id).push(p)
  }

  const sponsorReferralsMap = new Map()
  for (const u of users) {
    if (u.sponsor_id) {
      if (!sponsorReferralsMap.has(u.sponsor_id)) sponsorReferralsMap.set(u.sponsor_id, [])
      sponsorReferralsMap.get(u.sponsor_id).push(u.id)
    }
  }

  const earliestPkg = user.packages.sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0];
  const activationDate = earliestPkg ? new Date(earliestPkg.started_at) : null;

  console.log(`User ID: ${user.user_id} (${user.name || 'Jay Shree Krishna 10'})`);
  console.log(`Earliest package activated at: ${activationDate ? activationDate.toISOString() : 'None'}`);
  console.log(`Current Income Wallet Balance : $${user.income_wallet_balance}`);

  const ineligible = [];

  for (const b of bonuses) {
    // 1. Direct sponsor bonus check
    if (b.type === 'direct') {
      const memberPkgDate = pkgsByUserId.get(b.from_user_id)?.sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0]?.started_at;
      const eligible = activationDate && memberPkgDate && new Date(activationDate) <= new Date(memberPkgDate);
      if (!eligible) {
        ineligible.push(b);
      }
    }

    // 2. Level bonus check
    if (b.type === 'level') {
      const bonusDate = new Date(b.created_at);
      
      const hasActivePkgAtDist = user.packages.some(p => 
        new Date(p.started_at) <= bonusDate &&
        (p.completed_at === null || new Date(p.completed_at) > bonusDate)
      )

      // referrals active on bonus date
      const referrals = sponsorReferralsMap.get(userId) || [];
      const activeReferralsOnDate = referrals.filter(refId => {
        const refPkgs = pkgsByUserId.get(refId) || []
        return refPkgs.some(p => 
          new Date(p.started_at) <= bonusDate &&
          (p.completed_at === null || new Date(p.completed_at) > bonusDate)
        )
      }).length

      const eligible = hasActivePkgAtDist && activeReferralsOnDate >= b.level;
      if (!eligible) {
        ineligible.push(b);
      }
    }
  }

  console.log(`\nFound ${ineligible.length} ineligible bonuses:`);
  let totalAmount = 0;
  for (const b of ineligible) {
    const amt = parseFloat(b.amount);
    totalAmount += amt;
    console.log(`  - Bonus #${b.id} | Type: ${b.type.padEnd(6)} | Lvl: ${b.level} | Amt: $${amt.toFixed(2)} | From: ${b.from_user?.user_id} | Created: ${b.created_at.toISOString()}`);
  }

  console.log(`\nTotal amount to reverse: $${totalAmount.toFixed(2)}`);

  if (ineligible.length === 0) {
    console.log('✅ No ineligible bonuses found to reverse.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN: No changes were applied.');
    return;
  }

  console.log('\n🚀 Executing live fix sequentially...');
  let currentBalance = parseFloat(user.income_wallet_balance);

  for (const b of ineligible) {
    const amt = parseFloat(b.amount);
    currentBalance = currentBalance - amt;
    const remark = `[Fix] Reversal of ineligible ${b.type} bonus (level ${b.level}) from ${b.from_user?.user_id || 'unknown'} (failed audit criteria)`;

    await prisma.bonus.delete({ where: { id: b.id } });
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { income_wallet_balance: currentBalance }
  });

  console.log(`✅ User balance updated: $${user.income_wallet_balance} -> $${updatedUser.income_wallet_balance}`);
  console.log(`✅ Completed successfully.`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
