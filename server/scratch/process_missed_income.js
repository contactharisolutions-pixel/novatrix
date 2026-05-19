const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { triggerROIMatchingBonus } = require('../services/bonusEngine');

/** Simulate a trading pair for daily reports */
function pickTradingPair() {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'EUR/GBP', 'USD/JPY', 'GBP/USD', 'SOL/USDT'];
  return pairs[Math.floor(Math.random() * pairs.length)];
}

async function creditIncome(tx, userId, amount, remarks, refId) {
  const user = await tx.user.update({
    where: { id: userId },
    data:  { income_wallet_balance: { increment: amount } },
  });
  await tx.incomeLedger.create({
    data: {
      user_id:        userId,
      type:           'credit',
      amount,
      balance_after:  user.income_wallet_balance,
      remarks,
      reference_type: 'roi',
      reference_id:   refId,
    },
  });
  await tx.bonus.create({
    data: {
      user_id: userId,
      type:    'trading',
      level:   0,
      amount,
    },
  });
}

async function processMissed() {
  const targetDateStr = '2026-05-08'; // Friday
  const startOfFriday = new Date(targetDateStr + 'T00:00:00+05:30');
  const endOfFriday   = new Date(targetDateStr + 'T23:59:59+05:30');

  console.log(`Processing missed ROI for: ${targetDateStr}`);

  try {
    const activePackages = await prisma.tradePackage.findMany({
      where: { status: 'active' },
      include: { user: { select: { user_id: true } } }
    });

    console.log(`Checking ${activePackages.length} active packages...`);

    let processedCount = 0;

    for (const pkg of activePackages) {
      // Check if this package was started BEFORE or ON Friday
      if (new Date(pkg.started_at) > endOfFriday) {
          console.log(` - Package #${pkg.id} (${pkg.user.user_id}) started AFTER Friday. Skipping.`);
          continue;
      }

      // Check if it already received ROI for Friday
      const alreadyRan = await prisma.roiDistribution.findFirst({
        where: {
          package_id: pkg.id,
          created_at: { gte: startOfFriday, lte: endOfFriday }
        }
      });

      if (alreadyRan) {
        console.log(` - Package #${pkg.id} (${pkg.user.user_id}) already received ROI for Friday. Skipping.`);
        continue;
      }

      console.log(` [!] Package #${pkg.id} (${pkg.user.user_id}) missed Friday ROI. Processing...`);

      // Calculate ROI (Reusing logic from roiCron.js but simplified for manual run)
      const amount = parseFloat(pkg.amount);
      const totalEarned = parseFloat(pkg.total_earned);
      
      // Determine daily ROI rate (Assume 2% for new members as per launch rules)
      let dailyRoi = 2.0; 
      // In production roiCron.js has complex logic for 2% vs 1% vs 0.5%, 
      // but since the platform just launched on May 4, everyone is in the 2% window.
      
      const roiEarned = parseFloat((amount * dailyRoi / 100).toFixed(2));
      const maxMultiplier = 2; // Default, actual logic checks team but 2 is safe minimum
      const maxReturn = amount * maxMultiplier;
      const creditable = Math.min(roiEarned, maxReturn - totalEarned);

      if (creditable <= 0) {
          console.log(`   -> Already at max return. Skipping.`);
          continue;
      }

      const newTotal = totalEarned + creditable;
      const isDone = newTotal >= maxReturn;

      await prisma.$transaction(async (tx) => {
        await tx.tradePackage.update({
          where: { id: pkg.id },
          data: {
            total_earned:      newTotal,
            status:            isDone ? 'completed' : 'active',
            completed_at:      isDone ? new Date() : null,
          },
        });
        await creditIncome(
          tx,
          pkg.user_id,
          creditable,
          `Missed ROI for ${targetDateStr} (${dailyRoi}%) on package #${pkg.id}`,
          pkg.id
        );
        await tx.roiDistribution.create({
          data: {
            package_id: pkg.id,
            user_id:    pkg.user_id,
            amount:     creditable,
            pair_name:  pickTradingPair(),
            created_at: new Date(targetDateStr + 'T12:00:00+05:30'), // Set to noon Friday
          },
        });
      });

      // Trigger Matching Bonus (Level Income)
      try {
        await triggerROIMatchingBonus(pkg.user_id, pkg.user.user_id, creditable);
        console.log(`   -> Successfully credited ROI $${creditable} and triggered level income.`);
      } catch (matchErr) {
        console.error(`   -> Error triggering level income:`, matchErr.message);
      }

      processedCount++;
    }

    console.log(`\nDone. Total packages processed: ${processedCount}`);

  } catch (error) {
    console.error('Process failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

processMissed();
