const { distributeROI } = require('../services/roiCron');

async function test() {
  await distributeROI();
}

test().catch(console.error).finally(() => process.exit());
