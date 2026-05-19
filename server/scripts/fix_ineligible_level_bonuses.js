/**
 * Fix ineligible level bonuses detected by historical audit.
 * Reverses bonuses paid to sponsors who had NO active package on the
 * date of the ROI distribution (package activated AFTER that date).
 *
 * DRY_RUN=true (default) → report only
 * DRY_RUN=false          → reverse wallet + delete bonus
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'
const IST     = 5.5 * 60 * 60 * 1000
const toIST   = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]

// Bonus IDs to reverse — identified from historical audit
// Format: { id, userId (db id), amount, reason }
// All collected from audit output above
const INELIGIBLE_IDS = [
  488,489,496,497,498,499,500,501,502,503,506,507,508,509,511,
  527,528,529,530,531,534,535,536,537,538,539,540,541,542,543,
  546,547,548,549,550,559,560,561,562,563,596,611,476,481,526,
  566,477,478,479,480,525,568,486,487,491,523,570,482,483,495,
  513,565,484,485,492,493,505,519,574,544,551,553,554,556,557,
  558,586,587,593,594,595,597,609,599,601,605,606,607
]

async function main() {
  console.log(`\n${'═'.repeat(62)}`)
  console.log(` FIX: INELIGIBLE LEVEL BONUSES`)
  console.log(` Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE FIX'}`)
  console.log(`${'═'.repeat(62)}\n`)

  // Load all ineligible bonuses
  const bonuses = await p.bonus.findMany({
    where: { id: { in: INELIGIBLE_IDS }, type: 'level' },
    include: { user: { select: { id: true, user_id: true, name: true, income_wallet_balance: true } } },
    orderBy: { id: 'asc' }
  })

  console.log(`Found ${bonuses.length} bonus records to reverse (expected ${INELIGIBLE_IDS.length})`)

  // Group by user for summary
  const byUser = new Map()
  for (const b of bonuses) {
    if (!byUser.has(b.user_id)) byUser.set(b.user_id, { user: b.user, total: 0, ids: [] })
    const entry = byUser.get(b.user_id)
    entry.total += parseFloat(b.amount)
    entry.ids.push(b.id)
  }

  console.log('\n── REVERSAL PLAN ──────────────────────────────────────')
  for (const [uid, info] of byUser) {
    console.log(`  User ${info.user.user_id} (${info.user.name})`)
    console.log(`    Current balance : $${parseFloat(info.user.income_wallet_balance).toFixed(2)}`)
    console.log(`    Total to DEDUCT : -$${info.total.toFixed(2)}`)
    console.log(`    Bonus IDs       : [${info.ids.join(', ')}]`)
  }

  if (DRY_RUN) {
    console.log('\n ℹ️  DRY RUN — no data written.')
    console.log(' To apply: DRY_RUN=false node scripts/fix_ineligible_level_bonuses.js')
    await p.$disconnect(); return
  }

  console.log('\n── EXECUTING ──────────────────────────────────────────')
  let fixed = 0, errs = 0

  for (const [uid, info] of byUser) {
    try {
      await p.$transaction(async tx => {
        const updated = await tx.user.update({
          where: { id: uid },
          data:  { income_wallet_balance: { decrement: info.total } }
        })
        // Delete bonus records
        await tx.bonus.deleteMany({ where: { id: { in: info.ids } } })
        // Write one reversal ledger entry per user
        await tx.incomeLedger.create({
          data: {
            user_id:        uid,
            type:           'debit',
            amount:         info.total,
            balance_after:  updated.income_wallet_balance,
            remarks:        `[Fix] Reversed ${info.ids.length} ineligible level bonus(es) — sponsor had no active package on distribution date`,
            reference_type: 'bonus',
          }
        })
      })
      fixed += info.ids.length
      console.log(`  ✅ ${info.user.user_id} (${info.user.name}): reversed -$${info.total.toFixed(2)} (${info.ids.length} bonuses)`)
    } catch (e) {
      errs++
      console.error(`  ❌ ${info.user.user_id}: ${e.message}`)
    }
  }

  console.log(`\n── RESULT ─────────────────────────────────────────────`)
  console.log(`  Bonuses reversed  : ${fixed}`)
  console.log(`  Errors            : ${errs}`)
  if (errs === 0) console.log('\n ✅ All ineligible bonuses reversed. Re-run historical audit to confirm.')

  console.log(`${'═'.repeat(62)}\n`)
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
