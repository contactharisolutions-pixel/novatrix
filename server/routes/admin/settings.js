const router            = require('express').Router()
const multer            = require('multer')
const path              = require('path')
const authenticateAdmin = require('../../middleware/authenticateAdmin')
const { uploadToSupabase } = require('../../lib/supabase')

const prisma = require('../../lib/prisma')
// Multer for QR Upload
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticateAdmin)

// ─── GET /api/admin/settings ──────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
    // Convert to key-value object
    const obj = {}
    settings.forEach((s) => { obj[s.key] = s.value })
    res.json({ settings: obj, raw: settings })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/settings ──────────────────────────────────
// Body: { key, value } — upserts a single setting
router.put('/', async (req, res, next) => {
  const { key, value } = req.body
  if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' })
  try {
    await prisma.setting.upsert({
      where:  { key },
      update: { value: String(value), updated_by: req.admin.adminId },
      create: { key, value: String(value), updated_by: req.admin.adminId },
    })
    res.json({ message: `Setting '${key}' updated to '${value}'` })
  } catch (err) { next(err) }
})

// ─── PUT /api/admin/settings/bulk ────────────────────────────
// Body: { settings: { key: value, ... } }
router.put('/bulk', async (req, res, next) => {
  const { settings } = req.body
  if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'settings object required' })
  try {
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where:  { key },
          update: { value: String(value), updated_by: req.admin.adminId },
          create: { key, value: String(value), updated_by: req.admin.adminId },
        })
      )
    )
    res.json({ message: `${Object.keys(settings).length} settings updated` })
  } catch (err) { next(err) }
})

// ─── POST /api/admin/settings/upload-qr ─────────────────────
router.post('/upload-qr', upload.single('qr'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  try {
    const fileName = `system/qr-${Date.now()}${path.extname(req.file.originalname)}`
    const url = await uploadToSupabase(req.file.buffer, fileName, req.file.mimetype)
    
    await prisma.setting.upsert({
      where:  { key: 'deposit_qr_url' },
      update: { value: url, updated_by: req.admin.adminId },
      create: { key: 'deposit_qr_url', value: url, updated_by: req.admin.adminId },
    })
    res.json({ message: 'QR Code updated', url })
  } catch (err) { next(err) }
})

module.exports = router
