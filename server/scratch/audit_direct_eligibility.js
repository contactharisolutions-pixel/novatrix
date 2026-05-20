/**
 * AUDIT: Direct Referral Bonus Eligibility
 * 
 * RULE: Sponsor must have an active package BEFORE (or on the same day as)
 * the referral's package activation. If sponsor activated AFTER the referral,
 * the direct bonus is ineligible and should be reversed ("flushed out").
 *
 * READ-ONLY — no data changes.
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const IST = 5.5 * 60 * 60 * 1000
const toIST = dt => new Date(new Date(dt).getTime() + IST).toISOString().replace('T', ' ').slice(0, 19)

async function main() {
  console.log('\n' + '═'.repeat(68))
  console.log(' DIRECT REFERRAL BONUS — ELIGIBILITY AUDIT (READ ONLY)')
  console.log(' RULE: Sponsor must have active package ≤ referral activation date')
  console.log('═'.repeat(68))

  // Load all direct bonuses with relationships
  const directBonuses = await p.bonus.findMany({
    where: { type: 'direct' },
    include: {
      user:      { select: { id: true, user_id: true, name: true } }, // sponsor (recipient)
      from_user: { select: { id: true, user_id: true, name: true, sponsor_id: true } }, // referral
    },
    orderBy: { id: 'asc' }
  })

  // Load ALL packages (to find activation dates)
  const allPackages = await p.tradePackage.findMany({
    select: { id: true, user_id: true, amount: true, status: true, started_at: true },
    orderBy: { started_at: 'asc' }
  })

  // Build map: userId → earliest package start date
  const firstPkgDate = new Map()
  for (const pk of allPackages) {
    const existing = firstPkgDate.get(pk.user_id)
    if (!existing || new Date(pk.started_at) < new Date(existing.started_at)) {
      firstPkgDate.set(pk.user_id, pk)
    }
  }

  console.log(`\nTotal direct bonuses     : ${directBonuses.length}`)
  console.log(`Total members with pkgs  : ${firstPkgDate.size}`)

  const ineligible = []
  const eligible   = []

  for (const b of directBonuses) {
    const sponsorId  = b.user_id       // who received the bonus
    const referralId = b.from_user_id  // whose investment triggered it

    const sponsorPkg  = firstPkgDate.get(sponsorId)
    const referralPkg = firstPkgDate.get(referralId)

    if (!referralPkg) {
      console.log(`  ⚠️  Bonus #${b.id}: referral ${b.from_user?.user_id} has NO package — skip`)
      continue
    }

    if (!sponsorPkg) {
      // Sponsor has NO package at all — fully ineligible
      ineligible.push({
        bonus: b, sponsorPkg: null, referralPkg,
        reason: 'Sponsor has no active package at all'
      })
      continue
    }

    const sponsorActivated  = new Date(sponsorPkg.started_at)
    const referralActivated = new Date(referralPkg.started_at)

    // RULE: sponsor must have activated ON OR BEFORE referral activation
    if (sponsorActivated > referralActivated) {
      ineligible.push({ bonus: b, sponsorPkg, referralPkg, reason: 'Sponsor activated AFTER referral' })
    } else {
      eligible.push({ bonus: b, sponsorPkg, referralPkg })
    }
  }

  // ── Print eligible (for reference) ──────────────────────────
  console.log('\n' + '─'.repeat(68))
  console.log(` ✅ ELIGIBLE DIRECT BONUSES (${eligible.length})`)
  console.log('─'.repeat(68))
  for (const { bonus: b, sponsorPkg, referralPkg } of eligible) {
    console.log(
      `  Bonus #${String(b.id).padEnd(4)} | $${String(parseFloat(b.amount).toFixed(2)).padEnd(7)}` +
      ` | ${b.user.user_id} (${b.user.name}) ← ${b.from_user?.user_id} (${b.from_user?.name})` +
      `\n           Sponsor activated: ${toIST(sponsorPkg.started_at)} | Referral activated: ${toIST(referralPkg.started_at)}`
    )
  }

  // ── Print ineligible ─────────────────────────────────────────
  console.log('\n' + '─'.repeat(68))
  console.log(` ❌ INELIGIBLE DIRECT BONUSES — TO REVERSE (${ineligible.length})`)
  console.log('─'.repeat(68))
  let totalToReverse = 0
  for (const { bonus: b, sponsorPkg, referralPkg, reason } of ineligible) {
    const amt = parseFloat(b.amount)
    totalToReverse += amt
    console.log(
      `  Bonus #${b.id} | $${amt.toFixed(2)} | ${b.user.user_id} (${b.user.name}) ← ${b.from_user?.user_id} (${b.from_user?.name})`
    )
    console.log(`    Reason: ${reason}`)
    if (sponsorPkg) {
      console.log(`    Sponsor activated : ${toIST(sponsorPkg.started_at)} ($${sponsorPkg.amount})`)
    } else {
      console.log(`    Sponsor activated : NEVER`)
    }
    console.log(`    Referral activated: ${toIST(referralPkg.started_at)} ($${referralPkg.amount})`)
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(68))
  console.log(' SUMMARY')
  console.log('═'.repeat(68))
  console.log(` Total direct bonuses       : ${directBonuses.length}`)
  console.log(` Eligible (correct)         : ${eligible.length}`)
  console.log(` INELIGIBLE (to reverse)    : ${ineligible.length}`)
  console.log(` Total amount to reverse    : $${totalToReverse.toFixed(2)}`)
  console.log('\n ⚠️  READ-ONLY audit — no data changed.')
  console.log(' Provide approval to proceed with reversal.')
  console.log('═'.repeat(68))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
