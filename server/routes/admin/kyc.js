const router            = require('express').Router()
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const email             = require('../../services/emailService')

const prisma = require('../../lib/prisma')
router.use(authenticateAdmin)

// ─── GET /api/admin/kyc ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  const status = req.query.status || undefined
  try {
    const kycs = await prisma.kycDocument.findMany({
      where:   status ? { status } : {},
      orderBy: { created_at: 'desc' },
      include: { user: { select: { user_id: true, name: true, email: true } } },
    })
    res.json({ kycs })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/kyc/:id/approve ──────────────────────────
router.put('/:id/approve', async (req, res, next) => {
  try {
    const kyc = await prisma.kycDocument.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!kyc) return res.status(404).json({ error: 'KYC document not found' })

    await prisma.kycDocument.update({
      where: { id: kyc.id },
      data:  { status: 'approved', reviewed_by: req.admin.adminId, review_note: null },
    })

    email.kycStatusUpdate({ to: kyc.user.email, name: kyc.user.name, status: 'approved' })

    res.json({ message: 'KYC approved' })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/kyc/:id/reject ───────────────────────────
router.put('/:id/reject', async (req, res, next) => {
  const { note } = req.body
  if (!note?.trim()) return res.status(400).json({ error: 'Rejection note is required' })
  try {
    const kyc = await prisma.kycDocument.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!kyc) return res.status(404).json({ error: 'KYC document not found' })

    await prisma.kycDocument.update({
      where: { id: kyc.id },
      data:  { status: 'rejected', reviewed_by: req.admin.adminId, review_note: note.trim() },
    })

    email.kycStatusUpdate({ to: kyc.user.email, name: kyc.user.name, status: 'rejected', note: note.trim() })

    res.json({ message: 'KYC rejected' })
  } catch (err) { next(err) }
})

module.exports = router
