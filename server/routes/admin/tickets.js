const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/tickets ───────────────────────────────────
router.get('/', async (req, res, next) => {
  const status = req.query.status || undefined
  try {
    const tickets = await prisma.supportTicket.findMany({
      where:   status ? { status } : {},
      orderBy: { updated_at: 'desc' },
      include: {
        user: { select: { user_id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    })
    res.json({ tickets })
  } catch (err) { next(err) }
})

// ─── GET /api/admin/tickets/:id ───────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: {
        user:    { select: { user_id: true, name: true, email: true } },
        replies: { orderBy: { created_at: 'asc' }, include: { user: { select: { user_id: true, name: true } } } },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json({ ticket })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/tickets/:id/reply ───────────────────────
router.post('/:id/reply', async (req, res, next) => {
  const { message } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    await prisma.$transaction([
      prisma.ticketReply.create({
        data: { ticket_id: ticket.id, is_admin: true, message: message.trim() },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data:  { status: 'in_progress' },
      }),
    ])
    res.status(201).json({ message: 'Reply sent' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/tickets/:id/status ───────────────────────
router.put('/:id/status', async (req, res, next) => {
  const { status } = req.body
  const VALID = ['open', 'in_progress', 'closed']
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  try {
    await prisma.supportTicket.update({ where: { id: parseInt(req.params.id) }, data: { status } })
    res.json({ message: `Ticket marked as ${status}` })
  } catch (err) { next(err) }
})

module.exports = router
