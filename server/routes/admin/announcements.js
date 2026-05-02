const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/announcements ─────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { created_at: 'desc' },
      include: { created_by_admin: { select: { name: true } } },
    })
    res.json({ announcements })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/announcements ────────────────────────────
router.post('/', async (req, res, next) => {
  const { title, body, priority, target, target_user_id, published_at } = req.body
  if (!title || !body) return res.status(400).json({ error: 'title and body required' })
  try {
    const ann = await prisma.announcement.create({
      data: {
        title,
        body,
        priority:      priority || 'normal',
        target:        target   || 'all',
        target_user_id: target === 'specific' ? parseInt(target_user_id) : null,
        published_at:  published_at ? new Date(published_at) : new Date(),
        created_by:    req.admin.adminId,
      },
    })
    res.status(201).json({ message: 'Announcement created', id: ann.id })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/announcements/:id ────────────────────────
router.put('/:id', async (req, res, next) => {
  const { title, body, priority, published_at } = req.body
  try {
    await prisma.announcement.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title        && { title }),
        ...(body         && { body }),
        ...(priority     && { priority }),
        ...(published_at && { published_at: new Date(published_at) }),
      },
    })
    res.json({ message: 'Announcement updated' })
  } catch (err) { next(err) }
})

// ─── DELETE /api/admin/announcements/:id ─────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Announcement deleted' })
  } catch (err) { next(err) }
})

module.exports = router
