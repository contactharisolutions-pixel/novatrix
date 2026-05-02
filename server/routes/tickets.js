const router       = require('express').Router()
const authenticate = require('../middleware/authenticate')
const prisma = require('../lib/prisma')
router.use(authenticate)

// ─── POST /api/tickets/create ─────────────────────────────────
router.post('/create', async (req, res, next) => {
  const { subject, category, message } = req.body
  if (!subject || !category || !message) {
    return res.status(400).json({ error: 'subject, category, and message are required' })
  }
  const VALID_CATS = ['withdrawal', 'investment', 'technical', 'other']
  if (!VALID_CATS.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        user_id:  req.user.id,
        subject,
        category,
        message,
        status:   'open',
      },
    })
    res.status(201).json({ message: 'Ticket created', ticket_id: ticket.id })
  } catch (err) { next(err) }
})

// ─── GET /api/tickets ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where:   { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      select: {
        id:         true,
        subject:    true,
        category:   true,
        status:     true,
        created_at: true,
        updated_at: true,
        _count:     { select: { replies: true } },
      },
    })
    res.json({ tickets })
  } catch (err) { next(err) }
})

// ─── GET /api/tickets/:id ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where:   { id: parseInt(req.params.id), user_id: req.user.id },
      include: {
        replies: {
          orderBy: { created_at: 'asc' },
          include: { user: { select: { user_id: true, name: true } } },
        },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json({ ticket })
  } catch (err) { next(err) }
})

// ─── POST /api/tickets/:id/reply ──────────────────────────────
router.post('/:id/reply', async (req, res, next) => {
  const { message } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.id },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    if (ticket.status === 'closed') return res.status(400).json({ error: 'Cannot reply to a closed ticket' })

    await prisma.ticketReply.create({
      data: {
        ticket_id: ticket.id,
        user_id:   req.user.id,
        is_admin:  false,
        message:   message.trim(),
      },
    })
    // Re-open if ticket was in_progress (user replied)
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data:  { status: ticket.status === 'in_progress' ? 'open' : ticket.status },
    })
    res.status(201).json({ message: 'Reply sent' })
  } catch (err) { next(err) }
})

// ─── PUT /api/tickets/:id/close ───────────────────────────────
router.put('/:id/close', async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.id },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data:  { status: 'closed' },
    })
    res.json({ message: 'Ticket closed' })
  } catch (err) { next(err) }
})

module.exports = router
