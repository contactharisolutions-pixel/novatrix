# Novatrix — Investment Trading Platform

> A full-stack MLM investment platform built with React, Node.js/Express, and PostgreSQL.

[![Phase](https://img.shields.io/badge/Phase-5%20Complete-brightgreen)]()
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue)]()
[![Domain](https://img.shields.io/badge/Domain-novatrix.vip-purple)]()

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1 — Clone & Install

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2 — Configure Environment

```bash
# Copy and edit server env
cp server/.env.example server/.env
# Fill in DATABASE_URL, JWT_SECRET, SMTP_* vars
```

### 3 — Database Setup

```bash
cd server

# Push schema to DB (dev)
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed first admin account + default settings
npm run seed:admin
```

### 4 — Start Dev Servers

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

---

## 🏗️ Project Structure

```
novatrix/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── member/      # Shared member UI (ui.jsx, UrgentAnnouncementPopup)
│       │   ├── admin/       # Shared admin UI (ui.jsx)
│       │   ├── ProtectedRoute.jsx
│       │   └── AdminRoute.jsx
│       ├── layouts/
│       │   ├── PublicLayout.jsx
│       │   ├── MemberLayout.jsx   # Sidebar + announcement bell
│       │   └── AdminLayout.jsx    # Admin sidebar (orange theme)
│       ├── pages/
│       │   ├── public/      # Home, Login, Register, Privacy, Terms, Disclaimer
│       │   ├── member/      # 15 member pages (Phase 2 + 3)
│       │   └── admin/       # 10 admin pages (Phase 4)
│       ├── store/
│       │   ├── useAuthStore.js    # Member JWT store (Zustand + persist)
│       │   └── useAdminStore.js   # Admin JWT store (Zustand + persist)
│       └── lib/api.js             # Axios instance with auth interceptors
│
└── server/                  # Node.js + Express backend
    ├── middleware/
    │   ├── authenticate.js        # Member JWT guard
    │   ├── authenticateAdmin.js   # Admin JWT guard
    │   └── sanitize.js            # XSS input sanitization
    ├── routes/
    │   ├── auth.js                # Register, login, refresh
    │   ├── member.js              # Profile, dashboard stats, PIN
    │   ├── deposits.js            # Fund wallet deposits + Multer upload
    │   ├── trades.js              # Trade packages + bonus trigger
    │   ├── incomeWallet.js        # Ledger + internal transfer
    │   ├── withdrawals.js         # Withdrawal request + history
    │   ├── earnings.js            # Earnings summary + 30-day history
    │   │                          # Genealogy: directs, level report, D3 tree
    │   ├── tickets.js             # Support tickets (create/reply/close)
    │   ├── kyc.js                 # KYC document upload
    │   ├── announcements.js       # Announcements (all + urgent)
    │   └── admin/
    │       ├── auth.js            # Admin login + /me
    │       ├── dashboard.js       # Platform KPIs + CSV reports + ROI chart
    │       ├── members.js         # Search, filter, block, add balance
    │       ├── deposits.js        # Approve (credit wallet) / reject
    │       ├── withdrawals.js     # Approve (TxHash) / reject (auto-refund)
    │       ├── kyc.js             # Approve / reject with note
    │       ├── tickets.js         # Admin thread view + reply
    │       ├── announcements.js   # CRUD + schedule + target
    │       └── settings.js        # Bulk settings upsert
    ├── services/
    │   ├── bonusEngine.js         # 10-level commission distribution
    │   ├── roiCron.js             # Daily ROI cron (00:05 UTC, 2× cap)
    │   └── emailService.js        # Nodemailer (5 notification types)
    ├── scripts/
    │   └── seedAdmin.js           # Bootstrap first admin + default settings
    └── prisma/
        └── schema.prisma          # Full DB schema (14 models)
```

---

## 🎯 Features

### 👤 Member Panel (`/dashboard`)
| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/dashboard` | Wallet balances, stats, quick actions |
| Add Funds | `/dashboard/topup` | USDT deposit with screenshot upload |
| Trade Now | `/dashboard/trade` | Invest from wallet, choose package |
| Income Wallet | `/dashboard/income-wallet` | Ledger + fund transfer |
| Earnings | `/dashboard/earnings` | 30-day chart + donut breakdown |
| My Network | `/dashboard/genealogy` | D3.js interactive tree + level report |
| Withdraw | `/dashboard/withdraw` | PIN-protected withdrawal request |
| KYC | `/dashboard/kyc` | Document upload (front + back) |
| Support | `/dashboard/tickets` | Chat-style ticket thread |
| Announcements | `/dashboard/announcements` | Platform notices with urgent popup |

### 🛡️ Admin Panel (`/admin`)
| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/admin` | Platform KPIs + ROI chart |
| Members | `/admin/members` | Search, filter, block, add balance |
| Deposits | `/admin/deposits` | Approve/reject with screenshot preview |
| Withdrawals | `/admin/withdrawals` | Process with TxHash / reject + refund |
| KYC Queue | `/admin/kyc` | Review documents, approve/reject |
| Tickets | `/admin/tickets` | Admin reply thread |
| Announcements | `/admin/announcements` | Create/edit/delete/schedule |
| Settings | `/admin/settings` | All platform parameters |
| Reports | `/admin/reports` | CSV export (members/deposits/withdrawals) |

---

## 🔐 Security

- **JWT auth** — 7-day member tokens, 8-hour admin tokens with `adminId` claim
- **Transaction PIN** — bcrypt-hashed 6-digit PIN for all financial actions
- **Rate limiting** — 10 req/15min on auth, 5 req/15min on admin auth
- **Helmet.js** — HTTP security headers
- **CORS** — whitelist of allowed origins
- **Input sanitization** — XSS patterns stripped from all request bodies
- **Atomic transactions** — `prisma.$transaction` for all balance changes

---

## 💰 Business Logic

### ROI System
- Packages earn daily ROI (0.5% – 1.5%, configurable)
- Cron runs at **00:05 UTC** daily via `node-cron`
- Each package pays until **2× the invested amount** (cap = `roi_cap_multiplier`)

### Commission Structure
| Type | Rate | Trigger |
|------|------|---------|
| Direct Bonus | 10% | When direct referral activates a package |
| Level 1 | 5% | Indirect downline |
| Level 2 | 4% | ... |
| Level 3–4 | 3–2% | ... |
| Level 5–10 | 1% | ... |

### Withdrawal
- 5% platform fee deducted
- Minimum: $10 — Maximum: $5,000 (configurable via admin settings)
- Rejection auto-refunds the full amount to income wallet

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| State | Zustand (persist) |
| Charts | Recharts (line, area, donut) |
| Tree | D3.js (v7, hierarchical zoom/pan) |
| Forms | react-hook-form + Zod |
| Backend | Node.js, Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 14+ |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Uploads | Multer (local → Cloudinary in production) |
| Email | Nodemailer (Ethereal in dev) |
| Cron | node-cron |
| Security | Helmet, express-rate-limit |

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy dist/ to Vercel or push to GitHub with Vercel integration
```

### Backend → Railway / VPS
```bash
cd server
# Set all env vars on Railway dashboard
npm start
```

### Database → Railway PostgreSQL
```bash
# After provisioning, set DATABASE_URL env var, then:
npm run db:push
npm run seed:admin
```

---

## 📧 Email Setup (Production)

Set SMTP vars in `server/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@novatrix.vip
SMTP_PASS=your_app_password
EMAIL_FROM="Novatrix" <noreply@novatrix.vip>
```

> **Dev mode:** Leave SMTP blank — emails are sent to [Ethereal](https://ethereal.email) and a preview URL is logged to console.

---

## 📋 Development Commands

```bash
# Server
npm run dev           # Start with --watch
npm run seed:admin    # Create first admin account
npm run db:studio     # Open Prisma Studio
npm run db:push       # Sync schema (no migrations)
npm run db:migrate    # Create migration

# Client
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
```

---

## 📄 License

Private — All rights reserved © 2024 Novatrix
