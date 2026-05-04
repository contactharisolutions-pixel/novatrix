const router       = require('express').Router()
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

// ─── GET /api/genealogy/directs ───────────────────────────────
router.get('/directs', async (req, res, next) => {
  try {
    const directs = await prisma.user.findMany({
      where:   { sponsor_id: req.user.id },
      select:  { user_id: true, name: true, status: true, created_at: true, packages: { where: { status: 'active' }, select: { amount: true } } },
      orderBy: { created_at: 'desc' },
    })
    res.json({ directs: directs.map((u) => ({ ...u, total_invested: u.packages.reduce((s, p) => s + +p.amount, 0), packages: undefined })) })
  } catch (err) { next(err) }
})

// ─── GET /api/genealogy/level-report ─────────────────────────
router.get('/level-report', async (req, res, next) => {
  const page     = parseInt(req.query.page  || '1')
  const level    = parseInt(req.query.level || '0')
  const pageSize = 20
  try {
    const rows = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, user_id, name, status, sponsor_id, created_at, 1 AS lvl
        FROM "User" WHERE sponsor_id = ${req.user.id}
        UNION ALL
        SELECT u.id, u.user_id, u.name, u.status, u.sponsor_id, u.created_at, t.lvl + 1
        FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        WHERE t.lvl < 10
      )
      SELECT tree.id, tree.user_id, tree.name, tree.status, tree.lvl, tree.created_at,
             COALESCE(SUM(tp.amount), 0) AS total_invested
      FROM tree
      LEFT JOIN "TradePackage" tp ON tp.user_id = tree.id AND tp.status = 'active'
      GROUP BY tree.id, tree.user_id, tree.name, tree.status, tree.lvl, tree.created_at
      ORDER BY tree.lvl, tree.user_id
    `
    const levels = {}
    rows.forEach((r) => {
      const l = r.lvl
      if (!levels[l]) levels[l] = []
      levels[l].push({ user_id: r.user_id, name: r.name, status: r.status, total_invested: +r.total_invested, level: +r.lvl, created_at: r.created_at })
    })
    if (level > 0 && levels[level]) {
      const members = levels[level]
      const start   = (page - 1) * pageSize
      res.json({
        levels: { [level]: members.slice(start, start + pageSize) },
        pagination: { page, pageSize, total: members.length, pages: Math.ceil(members.length / pageSize) },
      })
    } else {
      res.json({ levels })
    }
  } catch (err) { next(err) }
})

// ─── GET /api/genealogy/tree ──────────────────────────────────
// D3-ready hierarchical tree (max 3 levels for canvas performance)
router.get('/tree', async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { user_id: true, name: true, status: true },
    })
    const rows = await prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, user_id, name, status, sponsor_id, 1 AS lvl
        FROM "User" WHERE sponsor_id = ${req.user.id}
        UNION ALL
        SELECT u.id, u.user_id, u.name, u.status, u.sponsor_id, t.lvl + 1
        FROM "User" u INNER JOIN tree t ON u.sponsor_id = t.id
        WHERE t.lvl < 3
      )
      SELECT id, user_id, name, status, sponsor_id, lvl FROM tree
    `
    const nodeMap = {}
    rows.forEach((r) => { nodeMap[r.id] = { ...r, children: [] } })
    const root = { id: req.user.id, user_id: me.user_id, name: me.name, status: me.status, lvl: 0, children: [] }
    rows.forEach((r) => {
      if (+r.lvl === 1) root.children.push(nodeMap[r.id])
      else { const p = nodeMap[r.sponsor_id]; if (p) p.children.push(nodeMap[r.id]) }
    })
    res.json({ tree: root })
  } catch (err) { next(err) }
})

module.exports = router
