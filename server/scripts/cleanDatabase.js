/**
 * Database Cleanup Script — Novatrix
 * ─────────────────────────────────────────────────────────────────────────────
 * Deletes ALL member / transactional data from Supabase while keeping:
 *   • Admin accounts  (Admin table)
 *   • Platform settings  (Setting table)
 *
 * Usage:
 *   node server/scripts/cleanDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const prisma = require('../lib/prisma')

async function main() {
  console.log('\n🧹  Novatrix Database Cleanup\n')
  console.log('⚠️   This will DELETE all member data from Supabase.')
  console.log('✅  Admin accounts & platform settings will be PRESERVED.\n')

  // ── 1. Delete leaf/child records first (no FK children) ──────────────────
  const roiDist    = await prisma.roiDistribution.deleteMany({})
  console.log(`   Deleted RoiDistribution  : ${roiDist.count}`)

  const ticketRepl = await prisma.ticketReply.deleteMany({})
  console.log(`   Deleted TicketReply      : ${ticketRepl.count}`)

  const bonuses    = await prisma.bonus.deleteMany({})
  console.log(`   Deleted Bonus            : ${bonuses.count}`)

  const incomeLedg = await prisma.incomeLedger.deleteMany({})
  console.log(`   Deleted IncomeLedger     : ${incomeLedg.count}`)

  const fundLedg   = await prisma.fundLedger.deleteMany({})
  console.log(`   Deleted FundLedger       : ${fundLedg.count}`)

  const fundTrans  = await prisma.fundTransfer.deleteMany({})
  console.log(`   Deleted FundTransfer     : ${fundTrans.count}`)

  const kyc        = await prisma.kycDocument.deleteMany({})
  console.log(`   Deleted KycDocument      : ${kyc.count}`)

  const announces  = await prisma.announcement.deleteMany({})
  console.log(`   Deleted Announcement     : ${announces.count}`)

  // ── 2. Delete parent records that still have children removed above ───────
  const tickets    = await prisma.supportTicket.deleteMany({})
  console.log(`   Deleted SupportTicket    : ${tickets.count}`)

  const packages   = await prisma.tradePackage.deleteMany({})
  console.log(`   Deleted TradePackage     : ${packages.count}`)

  const withdrawls = await prisma.withdrawal.deleteMany({})
  console.log(`   Deleted Withdrawal       : ${withdrawls.count}`)

  const deposits   = await prisma.deposit.deleteMany({})
  console.log(`   Deleted Deposit          : ${deposits.count}`)

  // ── 3. Delete all member users (User table) ───────────────────────────────
  const users      = await prisma.user.deleteMany({})
  console.log(`   Deleted User             : ${users.count}`)

  console.log('\n✅  Database cleaned successfully!')
  console.log('🔐  Admin accounts & settings remain intact.\n')
}

main()
  .catch((e) => {
    console.error('❌  Cleanup failed:', e.message)
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
