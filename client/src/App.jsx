import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layouts & Guards
import PublicLayout   from './layouts/PublicLayout'
import MemberLayout   from './layouts/MemberLayout'
import AdminLayout    from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'

// Eagerly loaded (critical path)
import Home     from './pages/public/Home'
import Login    from './pages/public/Login'
import Register from './pages/public/Register'
import NotFound from './pages/NotFound'

// ── Lazy: Public pages ────────────────────────────────────────
const Privacy    = lazy(() => import('./pages/public/Privacy'))
const Terms      = lazy(() => import('./pages/public/Terms'))
const Disclaimer = lazy(() => import('./pages/public/Disclaimer'))

// ── Lazy: Member pages (Phase 2) ─────────────────────────────
const Dashboard          = lazy(() => import('./pages/member/Dashboard'))
const ProfilePage        = lazy(() => import('./pages/member/ProfilePage'))
const WalletSetupPage    = lazy(() => import('./pages/member/WalletSetupPage'))
const TopupPage          = lazy(() => import('./pages/member/TopupPage'))
const TopupHistoryPage   = lazy(() => import('./pages/member/TopupHistoryPage'))
const TradePage          = lazy(() => import('./pages/member/TradePage'))
const TradeHistoryPage   = lazy(() => import('./pages/member/TradeHistoryPage'))
const IncomeWalletPage   = lazy(() => import('./pages/member/IncomeWalletPage'))
const EarningsPage       = lazy(() => import('./pages/member/EarningsPage'))
const GenealogyPage      = lazy(() => import('./pages/member/GenealogyPage'))
const WithdrawPage       = lazy(() => import('./pages/member/WithdrawPage'))
const WithdrawHistoryPage = lazy(() => import('./pages/member/WithdrawHistoryPage'))

// ── Lazy: Member pages (Phase 3) ─────────────────────────────
const TicketsPage        = lazy(() => import('./pages/member/TicketsPage'))
const KYCPage            = lazy(() => import('./pages/member/KYCPage'))
const AnnouncementsPage  = lazy(() => import('./pages/member/AnnouncementsPage'))
const DailyROI           = lazy(() => import('./pages/member/DailyROI'))
const DirectIncome       = lazy(() => import('./pages/member/DirectIncome'))
const LevelIncome        = lazy(() => import('./pages/member/LevelIncome'))
const RewardIncome       = lazy(() => import('./pages/member/RewardIncome'))
const RoyaltyIncome      = lazy(() => import('./pages/member/RoyaltyIncome'))
const FundTransfer       = lazy(() => import('./pages/member/FundTransfer'))
const ActivateID         = lazy(() => import('./pages/member/ActivateID'))
const FundHistory        = lazy(() => import('./pages/member/FundHistory'))

// ── Lazy: Admin pages (Phase 4) ──────────────────────────────
const AdminLogin         = lazy(() => import('./pages/admin/LoginPage'))
const AdminDashboard     = lazy(() => import('./pages/admin/DashboardPage'))
const AdminMembers       = lazy(() => import('./pages/admin/MembersPage'))
const AdminDeposits      = lazy(() => import('./pages/admin/DepositsPage'))
const AdminWithdrawals   = lazy(() => import('./pages/admin/WithdrawalsPage'))
const AdminKYC           = lazy(() => import('./pages/admin/KYCPage'))
const AdminTickets       = lazy(() => import('./pages/admin/TicketsPage'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AnnouncementsPage'))
const AdminSettings      = lazy(() => import('./pages/admin/SettingsPage'))
const AdminReports       = lazy(() => import('./pages/admin/ReportsPage'))
const AdminIncomeReports = lazy(() => import('./pages/admin/IncomeReportsPage'))
const AdminGenealogy     = lazy(() => import('./pages/admin/GenealogyPage'))

const TOAST_OPTIONS = {
  style: {
    background:   '#111827',
    color:        '#F1F5F9',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    fontSize:     '14px',
  },
  success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
  error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
}

/** Minimal spinner shown during route lazy-load */
function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f1e' }}>
      <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
      <Suspense fallback={<RouteLoader />}>
        <Routes>

          {/* ── Public website ───────────────────────────────── */}
          <Route element={<PublicLayout />}>
            <Route path="/"           element={<Home />}       />
            <Route path="/register"   element={<Register />}   />
            <Route path="/login"      element={<Login />}      />
            <Route path="/privacy"    element={<Privacy />}    />
            <Route path="/terms"      element={<Terms />}      />
            <Route path="/disclaimer" element={<Disclaimer />} />
          </Route>

          {/* ── Member Panel (JWT protected) ─────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberLayout />}>
              <Route index                   element={<Dashboard />}          />
              <Route path="profile"          element={<ProfilePage />}        />
              <Route path="wallet-setup"     element={<WalletSetupPage />}    />
              <Route path="topup"            element={<TopupPage />}          />
              <Route path="topup/history"    element={<TopupHistoryPage />}   />
              <Route path="trade"            element={<TradePage />}          />
              <Route path="trade/history"    element={<TradeHistoryPage />}   />
              <Route path="income-wallet"    element={<IncomeWalletPage />}   />
              <Route path="earnings"         element={<EarningsPage />}       />
              <Route path="genealogy"        element={<GenealogyPage />}      />
              <Route path="withdraw"         element={<WithdrawPage />}       />
              <Route path="withdraw/history" element={<WithdrawHistoryPage />}/>
              <Route path="tickets"          element={<TicketsPage />}        />
              <Route path="kyc"              element={<KYCPage />}            />
              <Route path="announcements"    element={<AnnouncementsPage />}  />
              <Route path="earnings/daily"   element={<DailyROI />}           />
              <Route path="earnings/direct"  element={<DirectIncome />}       />
              <Route path="earnings/level"   element={<LevelIncome />}        />
              <Route path="earnings/reward"  element={<RewardIncome />}       />
              <Route path="earnings/royalty" element={<RoyaltyIncome />}      />
              <Route path="funds/transfer"   element={<FundTransfer />}       />
              <Route path="funds/activate"   element={<ActivateID />}         />
              <Route path="funds/history"    element={<FundHistory />}        />
            </Route>
          </Route>

          {/* ── Admin Panel ──────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index                element={<AdminDashboard />}     />
              <Route path="members"       element={<AdminMembers />}       />
              <Route path="deposits"      element={<AdminDeposits />}      />
              <Route path="withdrawals"   element={<AdminWithdrawals />}   />
              <Route path="kyc"           element={<AdminKYC />}           />
              <Route path="tickets"       element={<AdminTickets />}       />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="settings"      element={<AdminSettings />}      />
              <Route path="reports"       element={<AdminReports />}       />
              <Route path="income-reports" element={<AdminIncomeReports />} />
              <Route path="genealogy"     element={<AdminGenealogy />}     />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
