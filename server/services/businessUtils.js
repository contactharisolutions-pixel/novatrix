const prisma = require('../lib/prisma')
/**
 * Calculates business for each leg of a user
 * Returns leg1 (strongest), leg2 (2nd strongest), and leg3 (rest)
 */
async function getLegBusiness(userId) {
  // Get direct referrals
  const directs = await prisma.user.findMany({
    where: { sponsor_id: userId },
    select: { id: true }
  })

  const legTotals = []

  for (const direct of directs) {
    // Sum all TradePackage amounts in this referral's entire subtree
    const [res] = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM "User" WHERE id = ${direct.id}
        UNION ALL
        SELECT u.id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
      )
      SELECT COALESCE(SUM(amount), 0) as total FROM "TradePackage"
      WHERE user_id IN (SELECT id FROM tree)
    `
    legTotals.push(parseFloat(res?.total || 0))
  }

  // Sort descending
  legTotals.sort((a, b) => b - a)
  
  const leg1 = legTotals[0] || 0
  const leg2 = legTotals[1] || 0
  const leg3 = legTotals.slice(2).reduce((acc, curr) => acc + curr, 0)

  return { leg1, leg2, leg3 }
}

module.exports = { getLegBusiness }
