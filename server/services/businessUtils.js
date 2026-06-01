const prisma = require('../lib/prisma')
/**
 * Calculates business for each leg of a user
 * Returns leg1 (strongest), leg2 (2nd strongest), and leg3 (rest)
 */
async function getLegBusiness(userId) {
  const downline = await prisma.$queryRaw`
    WITH RECURSIVE tree AS (
      SELECT id, sponsor_id FROM "User" WHERE sponsor_id = ${userId}
      UNION ALL
      SELECT u.id, u.sponsor_id FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
    )
    SELECT id, sponsor_id FROM tree
  `;

  if (downline.length === 0) {
    return { leg1: 0, leg2: 0, leg3: 0 };
  }

  const downlineIds = downline.map(u => u.id);
  const directs = downline.filter(u => u.sponsor_id === userId);
  const directIds = directs.map(u => u.id);

  const packages = await prisma.tradePackage.groupBy({
    by: ['user_id'],
    where: {
      user_id: { in: downlineIds }
    },
    _sum: {
      amount: true
    }
  });

  const businessMap = {};
  for (const pkg of packages) {
    businessMap[pkg.user_id] = parseFloat(pkg._sum.amount || 0);
  }

  const childrenMap = {};
  for (const u of downline) {
    if (!childrenMap[u.sponsor_id]) {
      childrenMap[u.sponsor_id] = [];
    }
    childrenMap[u.sponsor_id].push(u.id);
  }

  function sumSubtree(nodeId) {
    let sum = businessMap[nodeId] || 0;
    const children = childrenMap[nodeId] || [];
    for (const childId of children) {
      sum += sumSubtree(childId);
    }
    return sum;
  }

  const legTotals = [];
  for (const directId of directIds) {
    legTotals.push(sumSubtree(directId));
  }

  legTotals.sort((a, b) => b - a);

  const leg1 = legTotals[0] || 0;
  const leg2 = legTotals[1] || 0;
  const leg3 = legTotals.slice(2).reduce((acc, curr) => acc + curr, 0);

  return { leg1, leg2, leg3 };
}

async function getRoiEligibility(userId) {
  // Single combined SQL query: fetch user packages + downline team investment in one round trip
  const [roiRow] = await prisma.$queryRaw`
    WITH RECURSIVE
      -- User's own packages sorted ascending (to find activation date)
      user_pkgs AS (
        SELECT amount, started_at
        FROM "TradePackage"
        WHERE user_id = ${userId}
        ORDER BY started_at ASC
      ),
      -- First activation date
      activation AS (
        SELECT started_at AS activation_date FROM user_pkgs LIMIT 1
      ),
      -- Compute the 15-day window limit
      window_limit AS (
        SELECT activation_date,
               activation_date + INTERVAL '15 days' AS limit_date
        FROM activation
      ),
      -- Sum member's own investment within the 15-day window
      member_inv AS (
        SELECT COALESCE(SUM(p.amount), 0) AS member_investment
        FROM user_pkgs p, window_limit w
        WHERE p.started_at <= w.limit_date
      ),
      -- Recursive downline
      downline AS (
        SELECT id FROM "User" WHERE sponsor_id = ${userId}
        UNION ALL
        SELECT u.id FROM "User" u JOIN downline d ON u.sponsor_id = d.id
      ),
      -- Sum downline investment within the 15-day window
      team_inv AS (
        SELECT COALESCE(SUM(tp.amount), 0) AS team_investment
        FROM "TradePackage" tp
        JOIN downline dl ON tp.user_id = dl.id, window_limit w
        WHERE tp.started_at <= w.limit_date
      )
    SELECT
      w.activation_date,
      w.limit_date,
      m.member_investment,
      t.team_investment
    FROM window_limit w, member_inv m, team_inv t
  `

  if (!roiRow) {
    return {
      status: 'pending_activation',
      multiplier: 2,
      activation_date: null,
      limit_date: null,
      days_remaining: 15,
      member_investment_15_days: 0,
      team_investment_15_days: 0,
      target_team_investment: 0,
      progress_percent: 0
    }
  }

  const activation_date = roiRow.activation_date
  const limit_date = roiRow.limit_date
  const member_investment_15_days = parseFloat(roiRow.member_investment || 0)
  const team_investment_15_days = parseFloat(roiRow.team_investment || 0)

  if (member_investment_15_days === 0) {
    return {
      status: 'pending_activation',
      multiplier: 2,
      activation_date,
      limit_date,
      days_remaining: 15,
      member_investment_15_days: 0,
      team_investment_15_days: 0,
      target_team_investment: 0,
      progress_percent: 0
    }
  }

  const target_team_investment = 3 * member_investment_15_days
  const is_eligible_3x = team_investment_15_days >= target_team_investment
  const now = new Date()
  const is_window_active = now <= new Date(limit_date)

  let days_remaining = 0
  if (is_window_active) {
    const time_diff = new Date(limit_date).getTime() - now.getTime()
    days_remaining = Math.max(0, Math.ceil(time_diff / (1000 * 60 * 60 * 24)))
  }

  let status = 'eligible_2x'
  let multiplier = 2
  if (is_eligible_3x) {
    status = 'eligible_3x'
    multiplier = 3
  } else if (is_window_active) {
    status = 'pending'
    multiplier = 2
  }

  const progress_percent = target_team_investment > 0
    ? Math.min(100, Math.round((team_investment_15_days / target_team_investment) * 100))
    : 0

  return {
    status,
    multiplier,
    activation_date,
    limit_date,
    days_remaining,
    member_investment_15_days,
    team_investment_15_days,
    target_team_investment,
    progress_percent
  }
}

module.exports = { getLegBusiness, getRoiEligibility }
