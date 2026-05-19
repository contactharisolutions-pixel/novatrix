require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const DRY_RUN = process.env.DRY_RUN !== 'false'
const IST = 5.5 * 60 * 60 * 1000
const toIST = dt => new Date(new Date(dt).getTime() + IST).toISOString().split('T')[0]

async function main() {
  console.log('\n=== FIX: Missing Level-2 bonuses for 682686 → L2 sponsor 138541 ===')
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'LIVE')

  // Verify: member 682686
  const member682686 = await p.user.findFirst({
    where: { user_id: '682686' },
    select: { id: true, user_id: true, name: true, sponsor_id: true }
  })
  console.log('\nMember 682686:', member682686.id, member682686.name, '| sponsor_id:', member682686.sponsor_id)

  // Their direct sponsor (should be someone with sponsor = 138541)
  const directSponsor = await p.user.findUnique({
    where: { id: member682686.sponsor_id },
    select: { id: true, user_id: true, name: true, sponsor_id: true, status: true }
  })
  console.log('Direct sponsor:', directSponsor.id, directSponsor.user_id, directSponsor.name, '| their sponsor_id:', directSponsor.sponsor_id)

  // L2 sponsor should be 138541
  const l2Sponsor = await p.user.findUnique({
    where: { id: directSponsor.sponsor_id },
    select: {
      id: true, user_id: true, name: true, status: true, sponsor_id: true,
      packages: { where: { status: 'active' }, select: { id: true } },
      _count: { select: { referrals: { where: { packages: { some: { status: 'active' } } } } } }
    }
  })
  console.log('\nL2 sponsor:', l2Sponsor.id, l2Sponsor.user_id, l2Sponsor.name)
  console.log('  status:', l2Sponsor.status)
  console.log('  active packages:', l2Sponsor.packages.length)
  console.log('  active direct downlines:', l2Sponsor._count.referrals, '(need >= 2 for level-2)')

  const isEligible = l2Sponsor.status === 'active' && l2Sponsor.packages.length > 0 && l2Sponsor._count.referrals >= 2
  console.log('  ELIGIBLE for L2:', isEligible)

  if (!isEligible) {
    console.log('\n⚠️  L2 sponsor is NOT eligible — no backfill needed. Skipping.')
    return
  }

  // Only Dist #81 (19/05) is genuinely missing.
  // Dist #128 (17/05) and #136 (18/05) were correctly skipped at the time because
  // OMKAR1 (the 2nd active downline) only activated on 19/05 — so 138541 had
  // only 1 active downline on those days and was NOT yet eligible for Level-2.
  const missingDists = [
    { distId: 81, date: '2026-05-19', roiAmt: 2 },
  ]

  const RATE_L2    = 15  // 15% at level 2
  const expectedAmt = parseFloat((2 * RATE_L2 / 100).toFixed(2))  // $0.30

  console.log('\nExpected L2 amount per dist: $' + expectedAmt + ' ($2 ROI × 15%)')

  for (const md of missingDists) {
    // Double-check it doesn't already exist
    const existing = await p.bonus.findFirst({
      where: {
        user_id:      l2Sponsor.id,
        from_user_id: member682686.id,
        type:         'level',
        level:        2,
        created_at: {
          gte: new Date(md.date + 'T00:00:00+05:30'),
          lte: new Date(md.date + 'T23:59:59+05:30'),
        }
      }
    })

    if (existing) {
      console.log('\n  ✓ Dist #' + md.distId + ' | ' + md.date + ' — already paid (bonus #' + existing.id + ')')
      continue
    }

    console.log('\n  ⚠️  Dist #' + md.distId + ' | ' + md.date + ' — MISSING $' + expectedAmt + ' → ' + l2Sponsor.user_id + ' (' + l2Sponsor.name + ')')

    if (DRY_RUN) continue

    // Credit the bonus
    const createdAt = new Date(md.date + 'T12:00:00+05:30')
    try {
      await p.$transaction(async tx => {
        const updated = await tx.user.update({
          where: { id: l2Sponsor.id },
          data:  { income_wallet_balance: { increment: expectedAmt } }
        })
        await tx.bonus.create({
          data: {
            user_id:      l2Sponsor.id,
            from_user_id: member682686.id,
            type:         'level',
            level:        2,
            amount:       expectedAmt,
            created_at:   createdAt,
          }
        })
        await tx.incomeLedger.create({
          data: {
            user_id:        l2Sponsor.id,
            type:           'credit',
            amount:         expectedAmt,
            balance_after:  updated.income_wallet_balance,
            remarks:        '[Backfill] Level 2 ROI matching from 682686 (dist #' + md.distId + ', ' + md.date + ')',
            reference_type: 'bonus',
            created_at:     createdAt,
          }
        })
      })
      console.log('    ✅ Credited $' + expectedAmt + ' to ' + l2Sponsor.user_id + ' (' + l2Sponsor.name + ')')
    } catch (err) {
      console.error('    ❌ Error:', err.message)
    }
  }

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
