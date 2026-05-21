const { distributeROI } = require('../services/roiCron')

async function main() {
  console.log('🚀 Triggering daily ROI and Level Income distribution for today (May 21, 2026)...')
  try {
    await distributeROI()
    console.log('✅ Daily ROI and Level Income distribution completed successfully.')
  } catch (err) {
    console.error('❌ Error running daily ROI distribution:', err)
  }
}

main().catch(console.error)
