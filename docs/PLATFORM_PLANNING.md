# 🏛️ Novatrix Platform — Full Planning & Documentation
> **Domain:** [novatrix.vip](https://novatrix.vip) · Member Panel: [member.novatrix.vip](https://member.novatrix.vip) · Admin Panel: [admin.novatrix.vip](https://admin.novatrix.vip)
> Inspired by CapitalHub.vip | Smart Crypto & Forex Investment Platform with MLM/Referral Network

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Public Website](#3-public-website)
4. [Member Panel](#4-member-panel)
5. [Admin Panel](#5-admin-panel)
6. [Database Schema](#6-database-schema)
7. [API Architecture](#7-api-architecture)
8. [Development Roadmap](#8-development-roadmap)
9. [Security Checklist](#9-security-checklist)

---

## 1. Project Overview

**Novatrix** is a full-stack investment platform combining:
- A **public marketing website** to attract new members
- A **member dashboard** for managing investments, referrals, and withdrawals
- A **fully-controlled admin panel** for platform management

### Core Business Model

| Feature | Description |
|---|---|
| Trading Income | Daily ROI from Crypto/Forex trading (~1% daily until 2× return) |
| Direct Referral Bonus | Reward for bringing new active investors |
| Level/Team Bonus | Multi-level commissions from downline trading activity |
| Fund Wallet | Deposit wallet for topping up and starting trades |
| Income Wallet | Accumulates all earned bonuses; used for withdrawal |
| Withdrawal | USDT (BEP20) withdrawals from Income Wallet |

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Routing | React Router v6 |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Notifications | React Hot Toast |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express.js |
| Auth | JWT + bcrypt |
| OTP/Email | Nodemailer + SMTP |
| Database | PostgreSQL |
| ORM | Prisma |
| File Uploads | Multer |
| Cron Jobs | node-cron |
| Env Config | dotenv |

### Infrastructure
| Component | Tool |
|---|---|
| Database | PostgreSQL 16 |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Railway / Render |
| File Storage | Cloudinary |
| Domain | `novatrix.vip` (+ subdomains: member, admin, api) |
| SSL | Auto via Vercel / Let's Encrypt |

---

## 3. Public Website

### 3.1 Design Specifications

| Property | Value |
|---|---|
| Theme | Dark (deep navy `#0B1120` base) |
| Accent Colors | Cyan `#00D4FF`, Orange `#FF7A00` |
| Typography | Inter / Outfit (Google Fonts) |
| Style | Glassmorphism cards, gradient CTAs |
| Animations | Scroll-reveal, floating particles, counter animations |

### 3.2 Navigation Header
- Logo (left)
- Menu: Home · About · Services · Mission · How It Works · FAQ · Contact
- CTAs: [Login] [Join Now]
- Sticky with glassmorphism background on scroll

### 3.3 Homepage Sections

#### Section 1 — Hero
- Headline: "Smart Crypto & Forex Trading Platform"
- Subtext: Grow your capital through intelligent market strategies
- CTAs: [Get Started Now] [Watch How It Works]
- Background: Animated particle network / globe
- Stats bar: Total Members | Total Invested | Countries | Daily Trades

#### Section 2 — About Us
- Platform description + founding story
- 4 stat highlight cards: Members, Countries, Trading Pairs, Founded Year

#### Section 3 — Our Services (6 Cards)
| Service | Description |
|---|---|
| Smart Crypto Trading | AI-assisted signals on major pairs |
| Forex Trading | 20+ forex pairs |
| Managed Investments | Passive income portfolio management |
| Referral Earnings | Earn from your network |
| Smart Technology | Automated bots and analytics |
| Secure Platform | 2FA, encrypted wallets, OTP |

#### Section 4 — Mission & Vision
- Split layout: Mission (left) | Vision (right)
- Animated KPI progress bars

#### Section 5 — How It Works (4 Steps)
1. Create Account → Register with referral link
2. Choose Plan → Select investment amount ($50+)
3. Market Trading → Platform trades on your behalf
4. Earn Returns → Daily profit until 2× return

#### Section 6 — Investment Plans

| Plan | Min Investment | Daily ROI | Duration |
|---|---|---|---|
| Starter | $50 | ~0.8% | Until 2× |
| Standard | $500 | ~1.0% | Until 2× |
| Premium | $5,000 | ~1.2% | Until 2× |

#### Section 7 — Why Choose Us (6-Card Grid)
- 100% Transparent Earnings
- Instant Referral Bonuses
- Secure USDT Withdrawals
- Multi-level Team Commissions
- 24/7 Live Support
- No Hidden Fees

#### Section 8 — FAQ (Accordion — 8 Questions)
- What is the platform?
- How do I start investing?
- How are profits generated?
- How do I withdraw earnings?
- Is my investment safe?
- How does the referral program work?
- What is the minimum withdrawal?
- What cryptocurrencies are supported?

#### Section 9 — Testimonials (Auto-Carousel)
- Member name, photo avatar, location, star rating, earnings quote

#### Section 10 — Footer
- Logo + description + social icons (Telegram, X, Instagram, YouTube)
- Quick Links + Legal Links (Privacy, Terms, Disclaimer)
- **Contact:**
  - Email: `support@novatrix.vip`
  - Telegram: `@novatrix_official`
  - Support Hours: 24/7
- **URLs:** Main → `https://novatrix.vip` | Member → `https://member.novatrix.vip` | Admin → `https://admin.novatrix.vip`
- Copyright: © 2026 Novatrix.vip — All Rights Reserved.

### 3.4 Additional Public Pages

| Page | Full URL | Content |
|---|---|---|
| Register | `https://novatrix.vip/register` | Referral auto-fill, name, email, phone, password |
| Login | `https://novatrix.vip/login` | Redirects to `member.novatrix.vip` |
| Privacy Policy | `https://novatrix.vip/privacy` | Data handling policy |
| Terms of Service | `https://novatrix.vip/terms` | Platform terms |
| Disclaimer | `https://novatrix.vip/disclaimer` | Investment risk disclosure |

### 3.5 Subdomain Structure

| Subdomain | Purpose |
|---|---|
| `novatrix.vip` | Public marketing website |
| `member.novatrix.vip` | Member dashboard panel |
| `admin.novatrix.vip` | Admin control panel |
| `api.novatrix.vip` | Backend REST API |

---

## 4. Member Panel

### 4.1 Design Specifications

| Property | Value |
|---|---|
| Theme | Dark purple/navy glassmorphism |
| Primary | `#6C3CE1` purple / `#1E2A4A` navy |
| Accent | `#00D4FF` cyan, `#10B981` green |
| Layout | Collapsible left sidebar + top header + main content |

### 4.2 Sidebar Navigation

```
Dashboard
Profile
  ├── My Profile
  ├── Set Wallet Address
  ├── Change Password
  └── Transaction Password
Fund / Topup
  ├── Add Balance
  └── Balance History
Trading
  ├── Trade Now (Invest)
  ├── Transfer Income to Trade
  └── Trade Package History
Genealogy
  ├── Tree View
  ├── Direct Referrals
  └── Level Team Report
Earnings
  └── Total Earning Summary
Income Wallet
  ├── Wallet Ledger
  └── Fund Transfer
Withdrawal
  ├── Withdraw Request
  └── Withdrawal History
Support
  ├── My Tickets
  └── Create Ticket
Logout
```

### 4.3 Module Details

#### Dashboard
**Stats Cards Row 1:**
| Card | Sample Value |
|---|---|
| Withdraw Wallet Balance | $1,410.24 |
| Fund Wallet Balance | $0.00 |
| Total Topup | $1,930.00 |
| Total Withdraw | $1,630.00 |
| Today's Business | $200.00 |
| Total Earning | $3,454.29 |

**Team Stats Row:**
| Stat | Value |
|---|---|
| Total Team | 1,756 |
| Active Team | 1,167 |
| Direct Referrals | Count |
| New Joins Today | Count |

**Widgets:**
- Referral Link with Copy button
- Earnings Chart (last 30 days line chart)
- Recent Transactions (last 5)
- Announcements ticker

#### Profile
- View: User ID, Name, Email, Phone, Status badge (ACTIVE/INACTIVE), Sponsor ID, Join Date
- Edit: Profile photo upload, phone update
- Set BEP20 wallet address (OTP verified, limited changes)
- Change login password (with strength indicator)
- Set / change 6-digit transaction PIN

#### Fund Wallet (Topup)
- Submit deposit: Amount + USDT QR code displayed + upload payment screenshot
- Admin manually approves
- **Balance History Table:** Date | Amount | TxHash | Status | Approved By

#### Trading
- Invest from Fund Wallet (min $50) or Income Wallet (min $10)
- Transfer Income Wallet → active trade pool
- **Trade Package History:** Package ID | Amount | ROI% | Earned So Far | Status | Start Date | End Date

#### Genealogy (Network)
- Interactive tree visualization (D3.js canvas)
- Node colors: Green=Active, Red=Inactive, Gray=Blocked
- **Direct Referrals Table:** User ID | Name | Join Date | Package | Status | Earning from this member
- **Level Team Report:** Filter by level 1–10, columns: Level | User ID | Name | Investment | Status

#### Earnings Summary
| Bonus Type | Description |
|---|---|
| Daily Trading Profit | ROI from all active packages |
| Direct Referral Bonus | 1st-level direct commissions |
| Level Bonus | Multi-level team commissions |

- Donut chart breakdown + date range filter

#### Income Wallet
- **Ledger Table:** Date | Type | Amount | Balance After | Remarks
- Searchable, filterable by type, exportable CSV
- Internal transfer to Fund Wallet (requires transaction PIN, min $10)

#### Withdrawal
- Form shows: BEP20 address (from profile), available balance, enter amount, fee deduction preview, net payout
- Requires transaction PIN to submit
- **History Table:** Date | Amount | Fee | Net | Wallet Address | TxHash | Status

#### Support
- **Create Ticket Form:** Subject | Category (dropdown) | Message | Attachment (optional)
- **My Tickets Table:** Ticket ID | Subject | Created | Status | View/Reply action
- Ticket detail: Full conversation thread with admin replies

---

## 5. Admin Panel

### 5.1 Design
- Light/Dark mode toggle
- Persistent left sidebar
- Role-based access: Super Admin > Manager > Support

### 5.2 Admin Sidebar Structure

```
Dashboard
Members
  ├── All Members
  ├── Active Members
  ├── Blocked Members
  └── Add Member Manually
Fund Management
  ├── Pending Deposits
  ├── Approved Deposits
  └── All Deposit History
Trading Management
  ├── Active Packages
  ├── Completed Packages
  ├── Run Daily ROI
  └── Trade Pair Settings
Withdrawal Management
  ├── Pending Withdrawals
  ├── Approved Withdrawals
  ├── Rejected Withdrawals
  └── Withdrawal Settings
Bonus Management
  ├── Direct Referral Bonus Settings
  ├── Level Bonus Matrix (1–10)
  └── Bonus Logs
Network / Genealogy
  ├── View Any Member's Tree
  └── Level Report
Reports
  ├── Daily Income Report
  ├── Member Earnings Report
  ├── Business Volume Report
  └── Export CSV / Excel
Announcements
  ├── All Announcements
  └── Create Announcement
KYC Management
  ├── Pending KYC
  ├── Approved KYC
  └── Rejected KYC
Settings
  ├── General Settings
  ├── Investment Plans
  ├── Wallet Settings
  ├── ROI Settings
  ├── SMTP Settings
  └── Maintenance Mode
Admin Users
  ├── All Admins
  └── Add Admin
Logout
```

### 5.3 Admin Module Details

#### Dashboard KPIs
| Metric | Description |
|---|---|
| Total Members | All registered users |
| Active Members | Currently investing |
| New Today | Registrations today |
| Total Business | Sum of all approved deposits |
| Today's Business | Deposits approved today |
| Pending Withdrawals | Count + total amount |
| Total Paid Out | All approved withdrawals |
| Platform Balance | Total deposits − total withdrawals |

**Charts:** Member growth (30 days), Business volume (bar), Withdrawals vs Deposits (area)

#### Member Management
- Full searchable/filterable member table
- **Actions per member:** View Profile | Edit | Block/Unblock | Reset Password | Add Balance | View Network
- **Member Detail View:** Full profile + all wallet balances + transaction history + network summary + all bonuses received + KYC status

#### Deposit Approval
- **Pending Table:** User ID | Name | Amount | TxHash | Screenshot (preview link) | Date
- **Approve:** Credits Fund Wallet + auto-triggers referral bonuses
- **Reject:** Add rejection reason note

#### Trading Management
- View all active/completed packages across all users
- Manual Daily ROI run (confirm dialog) + scheduled cron
- Trade pair settings: Add/remove pairs, set ROI weight per pair

#### Withdrawal Approval
| Column | Action |
|---|---|
| User, Amount, Fee, Net, Wallet, Date | Approve → enter TxHash |
| | Reject → enter reason |
| | Bulk approve |
| | Export selected |

On Approve: TxHash stored, Income Wallet debited, email notification sent to member

#### Bonus / Level Settings
- **Direct Referral Bonus %:** e.g., 5% of referred member's first deposit
- **Level Bonus Matrix:**

| Level | Default % |
|---|---|
| Level 1 | 10% |
| Level 2 | 5% |
| Level 3 | 3% |
| Level 4 | 2% |
| Level 5–10 | 1% each |

- **Bonus Logs:** Full audit trail filterable by user, type, date

#### Reports
| Report | Filters | Export |
|---|---|---|
| Daily Income | Date range | CSV, Excel |
| Member Earnings | User, Bonus type | CSV |
| Business Volume | Date, Level | Excel |
| Withdrawal | Date, Status | CSV |
| Network | User ID | PDF |

#### Announcements
- Title, Body (rich text editor), Target: All / Specific user
- Schedule publish date/time
- Priority: Normal | Urgent (shown as popup)

#### KYC Management
- Document types: National ID, Passport, Driver's License
- Front + back image preview in modal
- Approve / Reject with mandatory review note
- Approved → member KYC status updates to VERIFIED

#### System Settings
| Setting | Description |
|---|---|
| Site Name & Logo | Branding |
| Maintenance Mode | Toggle + custom message |
| Min Deposit | Minimum fund wallet topup amount |
| Min Withdrawal | Minimum withdrawal amount |
| Withdrawal Fee % | Platform cut on withdrawal |
| Max Withdrawal/Day | Per-user daily cap |
| Daily ROI % | Global or per-plan ROI |
| Investment Min/Max | Per trade limits |
| SMTP | Host, Port, Sender Email (`noreply@novatrix.vip`), Password |
| Support Email | `support@novatrix.vip` |
| Site URL | `https://novatrix.vip` |

---

## 6. Database Schema

```sql
-- Users
users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(6) UNIQUE,           -- 6-digit auto-generated
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  password_hash TEXT,
  transaction_pin_hash TEXT,
  sponsor_id INT REFERENCES users(id),
  referral_code VARCHAR(10) UNIQUE,
  status VARCHAR(20) DEFAULT 'inactive', -- active|inactive|blocked
  bep20_wallet TEXT,
  fund_wallet_balance DECIMAL(18,2) DEFAULT 0,
  income_wallet_balance DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Deposits
deposits (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount DECIMAL(18,2),
  tx_hash TEXT,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending|approved|rejected
  admin_id INT REFERENCES admins(id),
  approved_at TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Trade Packages
trade_packages (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount DECIMAL(18,2),
  daily_roi_percent DECIMAL(5,2),
  total_earned DECIMAL(18,2) DEFAULT 0,
  max_return DECIMAL(18,2),             -- 2× amount
  status VARCHAR(20) DEFAULT 'active',  -- active|completed
  started_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Daily ROI Distributions
roi_distributions (
  id SERIAL PRIMARY KEY,
  package_id INT REFERENCES trade_packages(id),
  user_id INT REFERENCES users(id),
  amount DECIMAL(18,2),
  pair_name VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Bonuses
bonuses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  from_user_id INT REFERENCES users(id),
  type VARCHAR(20),                     -- direct|level|trading
  level INT DEFAULT 0,
  amount DECIMAL(18,2),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Income Wallet Ledger
income_ledger (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(10),                     -- credit|debit
  amount DECIMAL(18,2),
  balance_after DECIMAL(18,2),
  reference_type VARCHAR(50),
  reference_id INT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Withdrawals
withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount DECIMAL(18,2),
  fee DECIMAL(18,2),
  net_amount DECIMAL(18,2),
  wallet_address TEXT,
  tx_hash TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected
  admin_id INT REFERENCES admins(id),
  processed_at TIMESTAMP,
  reject_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Support Tickets
support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  subject TEXT,
  category VARCHAR(50),
  message TEXT,
  attachment_url TEXT,
  status VARCHAR(20) DEFAULT 'open',    -- open|in_progress|closed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Ticket Replies
ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INT REFERENCES support_tickets(id),
  user_id INT,
  is_admin BOOLEAN DEFAULT FALSE,
  message TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Announcements
announcements (
  id SERIAL PRIMARY KEY,
  title TEXT,
  body TEXT,
  target VARCHAR(20) DEFAULT 'all',     -- all|specific
  target_user_id INT,
  priority VARCHAR(10) DEFAULT 'normal', -- normal|urgent
  published_at TIMESTAMP,
  created_by INT REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW()
)

-- KYC Documents
kyc_documents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  doc_type VARCHAR(50),
  front_url TEXT,
  back_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by INT REFERENCES admins(id),
  review_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Admin Users
admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'support',   -- superadmin|manager|support
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Settings
settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE,
  value TEXT,
  updated_by INT REFERENCES admins(id),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

## 7. API Architecture

### Auth Endpoints
```
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/logout
POST  /api/auth/send-otp
POST  /api/auth/verify-otp
POST  /api/auth/refresh-token
```

### Member Endpoints
```
GET   /api/member/dashboard
GET   /api/member/profile
PUT   /api/member/profile
PUT   /api/member/wallet-address
PUT   /api/member/change-password
PUT   /api/member/transaction-pin

POST  /api/deposits/create
GET   /api/deposits/history

POST  /api/trades/invest
POST  /api/trades/transfer-income
GET   /api/trades/active
GET   /api/trades/history

GET   /api/genealogy/tree
GET   /api/genealogy/directs
GET   /api/genealogy/level-report

GET   /api/earnings/summary
GET   /api/income-wallet/ledger
POST  /api/income-wallet/fund-transfer

POST  /api/withdrawals/request
GET   /api/withdrawals/history

GET   /api/tickets
POST  /api/tickets
POST  /api/tickets/:id/reply

GET   /api/announcements
GET   /api/kyc/status
POST  /api/kyc/submit
```

### Admin Endpoints
```
GET   /api/admin/dashboard

GET   /api/admin/members
GET   /api/admin/members/:id
PUT   /api/admin/members/:id
PUT   /api/admin/members/:id/block
PUT   /api/admin/members/:id/unblock
POST  /api/admin/members/:id/add-balance
POST  /api/admin/members/create

GET   /api/admin/deposits/pending
PUT   /api/admin/deposits/:id/approve
PUT   /api/admin/deposits/:id/reject
GET   /api/admin/deposits/history

GET   /api/admin/trades/active
GET   /api/admin/trades/completed
POST  /api/admin/roi/run-daily

GET   /api/admin/withdrawals/pending
PUT   /api/admin/withdrawals/:id/approve
PUT   /api/admin/withdrawals/:id/reject
GET   /api/admin/withdrawals/history

GET   /api/admin/bonuses/settings
PUT   /api/admin/bonuses/settings
GET   /api/admin/bonuses/logs

GET   /api/admin/reports/:type        -- daily-income|member-earnings|business-volume|withdrawals|network

GET   /api/admin/announcements
POST  /api/admin/announcements
DELETE /api/admin/announcements/:id

GET   /api/admin/tickets
PUT   /api/admin/tickets/:id/reply
PUT   /api/admin/tickets/:id/close

GET   /api/admin/kyc/pending
PUT   /api/admin/kyc/:id/approve
PUT   /api/admin/kyc/:id/reject

GET   /api/admin/settings
PUT   /api/admin/settings

GET   /api/admin/admins
POST  /api/admin/admins
PUT   /api/admin/admins/:id
DELETE /api/admin/admins/:id
```

---

## 8. Development Roadmap

### Phase 1 — Foundation (Week 1–2) ✅ COMPLETE
- [x] Monorepo setup: `/client` (Vite+React) and `/server` (Express)
- [x] Database: PostgreSQL + Prisma schema + migrations
- [x] Auth system: Register, Login, JWT, Refresh, OTP via email
- [x] User model + 6-digit user ID + referral code generation
- [x] Public website: all 10 homepage sections (fully responsive)
- [x] Member panel shell: layout, sidebar, routing

### Phase 2 — Core Member Features (Week 3–4) ✅ COMPLETE
- [x] Fund Wallet: deposit form + QR + screenshot upload (Multer)
- [x] Trade Packages: invest from fund/income wallet, active/history views
- [x] Daily ROI cron job (node-cron, runs at 00:05 UTC)
- [x] Referral bonus engine: direct (10%) + levels 1–10
- [x] Income Wallet: ledger + internal fund transfer
- [x] Withdrawal: request form + fee calc + history table
- [x] Member panel layout: sidebar, header, protected routes
- [x] Profile: info edit, change password, transaction PIN, wallet setup
- [x] Earnings summary: donut chart (trading/direct/level breakdown)
- [x] Genealogy: direct referrals + recursive 10-level report

### Phase 3 — Network & Extras (Week 5–6) ✅ COMPLETE
- [x] Genealogy tree (D3.js interactive canvas — zoom/pan, status-colored nodes)
- [x] Level team report with pagination (per-level drill-down, 10 levels)
- [x] Earnings summary with Recharts donut + 30-day area chart
- [x] Support ticket system (create / list / chat-style reply / close)
- [x] KYC document upload (front + back, resubmit on rejection)
- [x] Announcements (accordion list + urgent dismissable popup with localStorage)

### Phase 4 — Admin Panel (Week 7–8) ✅ COMPLETE
- [x] Admin auth + role-based route guards (AdminRoute, 8h JWT with adminId claim)
- [x] Member management: search, filter, block/activate, add wallet balance
- [x] Deposit approval workflow + screenshot preview modal
- [x] Withdrawal approval + required TxHash entry + automatic refund on reject
- [x] KYC approval queue with document image previews (front + back)
- [x] Support tickets admin thread + reply + status management
- [x] Announcements CRUD (create/edit/delete/schedule/target)
- [x] System settings panel (Trading/Commissions/Withdrawals/Platform — bulk DB upsert)
- [x] Reports module with CSV export (members/deposits/withdrawals) + ROI chart

### Phase 5 — Polish & Deploy (Week 9–10) ✅ COMPLETE
- [x] Lazy loading: all 28 pages code-split into individual chunks (48 total, 0 errors)
- [x] Email notifications: deposit approved, withdrawal approved/rejected, KYC status, bonus credited
- [x] Input sanitization: XSS-strip middleware applied globally to all req.body
- [x] Rate limiting: 10 req/15min on /api/auth, 5 req/15min on /api/admin/auth
- [x] Admin seeder: `npm run seed:admin` bootstraps first superadmin + 16 default settings
- [x] .env.example: full template with SMTP, Cloudinary, seeder credentials
- [x] README.md: complete docs — setup, structure, features, tech stack, deploy guide

---

## 9. Security Checklist

- [ ] JWT access tokens (15min expiry) + refresh tokens (7 days)
- [ ] Transaction PIN (bcrypt hashed) for withdrawals and transfers
- [ ] OTP via email for wallet address changes and sensitive updates
- [ ] bcrypt (salt rounds: 12) for all passwords
- [ ] Rate limiting on `/api/auth/*` (max 10 req/15min per IP)
- [ ] Input validation via Zod on all endpoints
- [ ] Prisma parameterized queries (SQL injection prevention)
- [ ] XSS protection via helmet + sanitize-html
- [ ] HTTPS enforced in production
- [ ] Admin 2FA (TOTP via Google Authenticator)
- [ ] Full admin action audit log table
- [ ] Environment variables for all secrets (never committed to git)
- [ ] File upload validation (type, size, virus scan)
- [ ] CORS whitelist: allow only `https://novatrix.vip`, `https://member.novatrix.vip`, `https://admin.novatrix.vip`

---

> **Status:** All 5 Phases Complete ✅  
> **Build:** Production build passing — 48 code-split chunks, 0 errors  
> **Stack:** React 18 + Vite · Node.js/Express 5 · PostgreSQL · Prisma 7  
> **Next:** Deploy to Vercel (frontend) + Railway (backend + DB)
