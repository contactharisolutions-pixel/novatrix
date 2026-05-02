const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ─── GET /api/public/settings ────────────────────────────────
// Publicly accessible settings like deposit address/QR
router.get('/settings', async (req, res, next) => {
  try {
    const keys = ['deposit_address', 'deposit_qr_url']
    const settings = await prisma.setting.findMany({
      where: { key: { in: keys } }
    })
    
    const obj = {}
    settings.forEach(s => { obj[s.key] = s.value })
    
    // Set defaults if not found
    if (!obj.deposit_address) obj.deposit_address = 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXnovatrix'
    
    res.json({ settings: obj })
  } catch (err) { next(err) }
})

module.exports = router
