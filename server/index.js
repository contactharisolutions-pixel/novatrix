require('dotenv').config()
process.env.TZ = 'Asia/Kolkata' // Enforce IST timezone globally

// ─── Production Safety Guards ───────────────────────────────
const PLACEHOLDER_SECRETS = [
  'your_super_secret_jwt_key_change_in_production_min_32_chars',
  'your_refresh_secret_key_change_in_production',
  'your_super_secret_jwt_key_change_in_production_min_64_chars',
  'your_refresh_secret_key_change_in_production_min_64_chars',
]
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || PLACEHOLDER_SECRETS.includes(process.env.JWT_SECRET)) {
    console.error('❌ FATAL: JWT_SECRET is not set or is a placeholder. Set a strong secret in .env')
    process.exit(1)
  }
  if (!process.env.JWT_REFRESH_SECRET || PLACEHOLDER_SECRETS.includes(process.env.JWT_REFRESH_SECRET)) {
    console.error('❌ FATAL: JWT_REFRESH_SECRET is not set or is a placeholder. Set a strong secret in .env')
    process.exit(1)
  }
  if (!process.env.CRON_SECRET) {
    console.error('❌ FATAL: CRON_SECRET is not set. Set it to protect the /api/cron/run endpoint.')
    process.exit(1)
  }
}

const express   = require('express')
const cors      = require('cors')
const helmet    = require('helmet')
const rateLimit = require('express-rate-limit')
const path      = require('path')

// Member routes
const authRoutes          = require('./routes/auth')
const memberRoutes        = require('./routes/member')
const depositRoutes       = require('./routes/deposits')
const tradeRoutes         = require('./routes/trades')
const incomeWalletRoutes  = require('./routes/incomeWallet')
const withdrawalRoutes    = require('./routes/withdrawals')
const earningsRoutes      = require('./routes/earnings')
const ticketRoutes        = require('./routes/tickets')
const kycRoutes           = require('./routes/kyc')
const announcementRoutes  = require('./routes/announcements')
const genealogyRoutes     = require('./routes/genealogy')
const publicRoutes        = require('./routes/public')
const fundRoutes          = require('./routes/funds')
const cronRoutes          = require('./routes/cron')

// Admin routes
const adminAuthRoutes         = require('./routes/admin/auth')
const adminDashboardRoutes    = require('./routes/admin/dashboard')
const adminMemberRoutes       = require('./routes/admin/members')
const adminDepositRoutes      = require('./routes/admin/deposits')
const adminWithdrawalRoutes   = require('./routes/admin/withdrawals')
const adminKycRoutes          = require('./routes/admin/kyc')
const adminTicketRoutes       = require('./routes/admin/tickets')
const adminAnnouncementRoutes = require('./routes/admin/announcements')
const adminSettingsRoutes     = require('./routes/admin/settings')
const adminReportRoutes       = require('./routes/admin/reports')
const adminGenealogyRoutes    = require('./routes/admin/genealogy')

// Services
const { startROICron } = require('./services/roiCron')
const sanitizeInputs   = require('./middleware/sanitize')

const app  = express()
const PORT = process.env.PORT || 5000

// ─── Security ─────────────────────────────────────────────────
app.use(helmet())

// Dynamic CORS: allow origins from env (comma-separated) or fall back to localhost defaults
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://novatrix.vip',
      'https://www.novatrix.vip',
      'https://member.novatrix.vip',
      'https://admin.novatrix.vip',
    ]

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}))

// Rate limiting — auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Too many requests. Please try again later.' },
})
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      50,
  message:  { error: 'Too many admin login attempts.' },
})
app.use('/api/auth',        authLimiter)
app.use('/api/admin/auth',  adminAuthLimiter)

// ─── Body parsing & Sanitization ─────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(sanitizeInputs)   // Strip XSS patterns from all request bodies

// Serve uploaded screenshots (local dev only — production uses Supabase Storage)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
}

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Member API
app.use('/api/auth',          authRoutes)
app.use('/api/earnings',      earningsRoutes)
app.use('/api/member',        memberRoutes)
app.use('/api/deposits',      depositRoutes)
app.use('/api/trades',        tradeRoutes)
app.use('/api/income-wallet', incomeWalletRoutes)
app.use('/api/withdrawals',   withdrawalRoutes)
app.use('/api/genealogy',     genealogyRoutes)
app.use('/api/tickets',       ticketRoutes)
app.use('/api/kyc',           kycRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/public',        publicRoutes)
app.use('/api/funds',         fundRoutes)
app.use('/api/cron',          cronRoutes)

// Admin API
app.use('/api/admin/auth',          adminAuthRoutes)
app.use('/api/admin/settings',      adminSettingsRoutes)
app.use('/api/admin/members',       adminMemberRoutes)
app.use('/api/admin/deposits',      adminDepositRoutes)
app.use('/api/admin/withdrawals',   adminWithdrawalRoutes)
app.use('/api/admin/kyc',           adminKycRoutes)
app.use('/api/admin/tickets',       adminTicketRoutes)
app.use('/api/admin/announcements', adminAnnouncementRoutes)
app.use('/api/admin/reports',           adminReportRoutes)
app.use('/api/admin/genealogy',         adminGenealogyRoutes)
app.use('/api/admin',               adminDashboardRoutes)

// ─── 404 & Error handlers ─────────────────────────────────────
app.use((req, res) => {
  console.log(`[404 Not Found] ${req.method} ${req.url}`)
  res.status(404).json({ error: 'Route not found' })
})
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

// ─── Start server (local dev only) / Export for Vercel serverless ─────────
if (process.env.VERCEL !== '1') {
  // Running locally — start the HTTP server and the cron scheduler
  app.listen(PORT, () => {
    console.log(`✅ Novatrix API running on http://localhost:${PORT}`)
    startROICron()
  })
}

// REQUIRED: Vercel's @vercel/node runtime calls module.exports directly
module.exports = app
