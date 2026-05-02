const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/genealogy/search ─────────────────────────
// Find member details by user_id
router.get('/search', async (req, res, next) => {
  const { user_id } = req.query
  try {
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: { id: true, user_id: true, name: true, status: true }
    })
    if (!user) return res.status(404).json({ error: 'Member not found' })
    res.json({ user })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/genealogy/tree/:id ───────────────────────
router.get('/tree/:id', async (req, res, next) => {
  const targetId = parseInt(req.params.id)
  try {
    const rootUser = await prisma.user.findUnique({
      where:  { id: targetId },
      select: { user_id: true, name: true, status: true },
    })
    if (!rootUser) return res.status(404).json({ error: 'Root member not found' })

    const rows = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, user_id, name, status, sponsor_id, 1 AS lvl
        FROM "User" WHERE sponsor_id = ${targetId}
        UNION ALL
        SELECT u.id, u.user_id, u.name, u.status, u.sponsor_id, t.lvl + 1
        FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        WHERE t.lvl < 3
      )
      SELECT id, user_id, name, status, sponsor_id, lvl FROM tree
    `
    const nodeMap = {}
    rows.forEach((r) => { nodeMap[r.id] = { ...r, children: [] } })
    const tree = { id: targetId, user_id: rootUser.user_id, name: rootUser.name, status: rootUser.status, lvl: 0, children: [] }
    rows.forEach((r) => {
      if (+r.lvl === 1) tree.children.push(nodeMap[r.id])
      else { const p = nodeMap[r.sponsor_id]; if (p) p.children.push(nodeMap[r.id]) }
    })
    res.json({ tree })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/genealogy/levels/:id ─────────────────────
router.get('/levels/:id', async (req, res, next) => {
  const targetId = parseInt(req.params.id)
  try {
    const rows = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, user_id, name, status, sponsor_id, 1 AS lvl
        FROM "User" WHERE sponsor_id = ${targetId}
        UNION ALL
        SELECT u.id, u.user_id, u.name, u.status, u.sponsor_id, t.lvl + 1
        FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        WHERE t.lvl < 15
      )
      SELECT tree.id, tree.user_id, tree.name, tree.status, tree.lvl,
             COALESCE(SUM(tp.amount), 0) AS total_invested
      FROM tree
      LEFT JOIN "TradePackage" tp ON tp.user_id = tree.id AND tp.status = 'active'
      GROUP BY tree.id, tree.user_id, tree.name, tree.status, tree.lvl
      ORDER BY tree.lvl, tree.user_id
    `
    const levels = {}
    rows.forEach((r) => {
      const l = r.lvl
      if (!levels[l]) levels[l] = []
      levels[l].push({ user_id: r.user_id, name: r.name, status: r.status, total_invested: +r.total_invested, level: +r.lvl })
    })
    res.json({ levels })
  } catch (err) { next(err) }
})

module.exports = router
