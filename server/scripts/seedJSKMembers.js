/**
 * Seed Script — Jay Shree Krishna Members (from uploaded image)
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates 10 members in a linear referral chain:
 *   JSK01 → JSK02 → JSK03 → ... → JSK10
 *
 * Data sourced from the image shared by the user.
 *
 * Usage:
 *   node server/scripts/seedJSKMembers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const bcrypt = require('bcryptjs')
const prisma  = require('../lib/prisma')

// ── Helpers (mirrors auth.js logic) ─────────────────────────────────────────
async function generateUserId() {
  let id, exists = true
  while (exists) {
    id     = String(Math.floor(100000 + Math.random() * 900000))
    exists = await prisma.user.findUnique({ where: { user_id: id } })
  }
  return id
}

// ── Member data from the uploaded image ─────────────────────────────────────
// Referral chain: JSK01 has no sponsor; each subsequent member is referred by the previous one.
const MEMBERS = [
  { name: 'Jay Shree Krishna 01', email: 'jsk01@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: null },
  { name: 'Jay Shree Krishna 02', email: 'jsk02@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk01@gmail.com' },
  { name: 'Jay Shree Krishna 03', email: 'jsk03@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk02@gmail.com' },
  { name: 'Jay Shree Krishna 04', email: 'jsk04@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk03@gmail.com' },
  { name: 'Jay Shree Krishna 05', email: 'jsk05@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk04@gmail.com' },
  { name: 'Jay Shree Krishna 06', email: 'jsk06@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk05@gmail.com' },
  { name: 'Jay Shree Krishna 07', email: 'jsk07@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk06@gmail.com' },
  { name: 'Jay Shree Krishna 08', email: 'jsk08@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk07@gmail.com' },
  { name: 'Jay Shree Krishna 09', email: 'jsk09@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk08@gmail.com' },
  { name: 'Jay Shree Krishna 10', email: 'jsk10@gmail.com', phone: '+919898989898', password: 'abcd1234', sponsorEmail: 'jsk09@gmail.com' },
]

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Novatrix JSK Member Seeder\n')
  console.log('   Seeding 10 members in a linear referral chain...\n')

  // Keep a map of email → created user for sponsor resolution
  const createdUsers = {}

  for (const member of MEMBERS) {
    // Skip if already seeded
    const existing = await prisma.user.findUnique({ where: { email: member.email } })
    if (existing) {
      console.log(`   ⏭️   Already exists: ${member.name} (${member.email})`)
      createdUsers[member.email] = existing
      continue
    }

    // Resolve sponsor
    let sponsor = null
    if (member.sponsorEmail) {
      sponsor = createdUsers[member.sponsorEmail] ?? null
      if (!sponsor) {
        console.error(`   ❌  Sponsor not found for ${member.name}. Aborting.`)
        process.exit(1)
      }
    }

    const user_id       = await generateUserId()
    const password_hash = await bcrypt.hash(member.password, 12)
    const referral_code = `${user_id}`

    const user = await prisma.user.create({
      data: {
        user_id,
        name:          member.name,
        email:         member.email,
        phone:         member.phone,
        password_hash,
        referral_code,
        sponsor_id:    sponsor?.id ?? null,
        status:        'active',   // registered members are active
      },
    })

    createdUsers[member.email] = user

    console.log(`   ✅  Created : ${member.name}`)
    console.log(`       User ID : ${user.user_id}`)
    console.log(`       Ref Code: ${referral_code}`)
    console.log(`       Sponsor : ${sponsor ? sponsor.name : 'None (root)'}`)
    console.log()
  }

  console.log('✅  All 10 JSK members seeded successfully!\n')

  // Print summary table
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('  Name                      User ID   Referral Code  Sponsor')
  console.log('─────────────────────────────────────────────────────────────────')
  for (const [email, u] of Object.entries(createdUsers)) {
    const sponsor = u.sponsor_id
      ? Object.values(createdUsers).find(x => x.id === u.sponsor_id)?.name ?? 'Unknown'
      : 'None'
    console.log(`  ${u.name.padEnd(25)} ${u.user_id}    ${u.referral_code.padEnd(13)}  ${sponsor}`)
  }
  console.log('─────────────────────────────────────────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error('❌  Seeder failed:', e.message)
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
