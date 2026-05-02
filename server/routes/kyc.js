const router       = require('express').Router()
const multer       = require('multer')
const path         = require('path')
const authenticate = require('../middleware/authenticate')
const { uploadToSupabase } = require('../lib/supabase')

const prisma = require('../lib/prisma')
// Multer: use memory storage for direct upload to Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only images and PDF are allowed'))
  },
})

router.use(authenticate)

// ─── POST /api/kyc/submit ─────────────────────────────────────
router.post(
  '/submit',
  upload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }]),
  async (req, res, next) => {
    const { doc_type } = req.body
    if (!doc_type)          return res.status(400).json({ error: 'Document type is required' })
    if (!req.files?.front)  return res.status(400).json({ error: 'Front image is required' })

    try {
      // Upsert: if already submitted and pending/rejected, allow re-submission
      const existing = await prisma.kycDocument.findUnique({ where: { user_id: req.user.id } })
      if (existing?.status === 'approved') {
        return res.status(400).json({ error: 'KYC is already approved. No resubmission needed.' })
      }

      // Upload to Supabase
      const frontName = `kyc/${req.user.id}/front-${Date.now()}${path.extname(req.files.front[0].originalname)}`
      const frontUrl  = await uploadToSupabase(req.files.front[0].buffer, frontName, req.files.front[0].mimetype)
      
      let backUrl = null
      if (req.files.back) {
        const backName = `kyc/${req.user.id}/back-${Date.now()}${path.extname(req.files.back[0].originalname)}`
        backUrl = await uploadToSupabase(req.files.back[0].buffer, backName, req.files.back[0].mimetype)
      }

      const kyc = existing
        ? await prisma.kycDocument.update({
            where: { user_id: req.user.id },
            data: { doc_type, front_url: frontUrl, back_url: backUrl, status: 'pending', review_note: null },
          })
        : await prisma.kycDocument.create({
            data: { user_id: req.user.id, doc_type, front_url: frontUrl, back_url: backUrl, status: 'pending' },
          })

      res.status(201).json({ message: 'KYC submitted for review', kyc_id: kyc.id })
    } catch (err) { next(err) }
  }
)

// ─── GET /api/kyc/status ──────────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const kyc = await prisma.kycDocument.findUnique({
      where:  { user_id: req.user.id },
      select: { id: true, doc_type: true, status: true, review_note: true, created_at: true },
    })
    res.json({ kyc })
  } catch (err) { next(err) }
})

module.exports = router
