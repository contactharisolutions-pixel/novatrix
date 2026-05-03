const router       = require('express').Router()
const multer       = require('multer')
const path         = require('path')
const authenticate = require('../middleware/authenticate')
// bonusEngine is not used here — direct bonus is triggered in trades.js on package activation

const { uploadToSupabase } = require('../lib/supabase')

const prisma = require('../lib/prisma')
// Multer: use memory storage for direct upload to Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'))
  },
})

router.use(authenticate)

// ─── POST /api/deposits/create ────────────────────────────────
router.post('/create', upload.single('screenshot'), async (req, res, next) => {
  const { amount, tx_hash } = req.body
  if (!amount || amount < 10) return res.status(400).json({ error: 'Minimum deposit is $10' })
  if (!req.file)             return res.status(400).json({ error: 'Payment screenshot required' })

  try {
    const fileName = `deposits/${req.user.id}/proof-${Date.now()}${path.extname(req.file.originalname)}`
    const screenshotUrl = await uploadToSupabase(req.file.buffer, fileName, req.file.mimetype)

    const deposit = await prisma.deposit.create({
      data: {
        user_id:       req.user.id,
        amount:        parseFloat(amount),
        tx_hash:       tx_hash || null,
        screenshot_url: screenshotUrl,
        status:        'pending',
      },
    })
    res.status(201).json({ message: 'Deposit submitted for review', deposit_id: deposit.id })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/deposits/history ────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const deposits = await prisma.deposit.findMany({
      where:   { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    })
    res.json({ deposits })
  } catch (err) { next(err) }
})

module.exports = router
