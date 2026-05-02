const router       = require('express').Router()
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

// ─── GET /api/announcements ───────────────────────────────────
// Returns all published announcements targeted at this user or "all"
router.get('/', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        published_at: { lte: new Date() },
        OR: [
          { target: 'all' },
          { target: 'specific', target_user_id: req.user.id },
        ],
      },
      orderBy: { published_at: 'desc' },
      take:    20,
      select: {
        id:           true,
        title:        true,
        body:         true,
        priority:     true,
        published_at: true,
      },
    })
    res.json({ announcements })
  } catch (err) { next(err) }
})

// ─── GET /api/announcements/urgent ───────────────────────────
// Returns only urgent announcements published in the last 7 days
router.get('/urgent', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const announcements = await prisma.announcement.findMany({
      where: {
        priority:     'urgent',
        published_at: { gte: sevenDaysAgo, lte: new Date() },
        OR: [
          { target: 'all' },
          { target: 'specific', target_user_id: req.user.id },
        ],
      },
      orderBy: { published_at: 'desc' },
      take:    5,
    })
    res.json({ announcements })
  } catch (err) { next(err) }
})

module.exports = router
