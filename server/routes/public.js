const router = require('express').Router()
const prisma = require('../lib/prisma')
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

// ─── GET /api/public/sponsor/:code ──────────────────────────
// Fetch member name by referral code
router.get('/sponsor/:code', async (req, res, next) => {
  try {
    const { code } = req.params
    const user = await prisma.user.findUnique({
      where: { referral_code: code },
      select: { name: true }
    })
    
    if (!user) return res.status(404).json({ error: 'Sponsor not found' })
    res.json({ name: user.name })
  } catch (err) { next(err) }
})

module.exports = router
