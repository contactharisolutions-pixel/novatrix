import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, User, Wallet, TrendingUp, Network, DollarSign,
  ArrowUpFromLine, Ticket, LogOut, TrendingDown, Menu, X,
  Bell, Settings, ShieldCheck, ShieldAlert, Megaphone, ChevronDown,
  Activity, Trophy, Award, Send, Zap, History as HistoryIcon,
} from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import UrgentAnnouncementPopup from '../components/member/UrgentAnnouncementPopup'
import api from '../lib/api'

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/dashboard/profile',      icon: User,        label: 'My Profile'       },
      { to: '/dashboard/wallet-setup', icon: Settings,    label: 'Wallet Setup'     },
      { to: '/dashboard/kyc',          icon: ShieldCheck, label: 'KYC Verification' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/dashboard/topup',         icon: Wallet,     label: 'Add Funds'       },
      { to: '/dashboard/topup/history', icon: DollarSign, label: 'Deposit History' },
      { to: '/dashboard/funds/history',  icon: HistoryIcon,    label: 'Fund History'    },
      { to: '/dashboard/funds/transfer', icon: Send,       label: 'Wallet to Wallet Transfer' },
      { to: '/dashboard/funds/activate', icon: Zap,        label: 'ID Activation'   },
    ],
  },
  {
    label: 'Trading',
    items: [
      { to: '/dashboard/trade',         icon: TrendingUp,   label: 'Trade Now'     },
      { to: '/dashboard/trade/history', icon: TrendingDown, label: 'Trade History' },
    ],
  },
  {
    label: 'Earnings',
    items: [
      { to: '/dashboard/income-wallet',   icon: DollarSign,  label: 'Income Wallet'    },
      { to: '/dashboard/earnings',        icon: Activity,    label: 'Earnings Summary' },
      { to: '/dashboard/earnings/daily',  icon: TrendingUp,  label: 'Daily ROI'        },
      { to: '/dashboard/earnings/direct', icon: User,        label: 'Direct Income'    },
      { to: '/dashboard/earnings/level',  icon: Network,     label: 'Level Income'     },
      { to: '/dashboard/earnings/reward', icon: Trophy,      label: 'Reward Income'    },
      { to: '/dashboard/earnings/royalty', icon: Award,       label: 'Royalty Income'   },
    ],
  },
  {
    label: 'Network',
    items: [
      { to: '/dashboard/genealogy', icon: Network, label: 'My Network' },
    ],
  },
  {
    label: 'Withdrawal',
    items: [
      { to: '/dashboard/withdraw',         icon: ArrowUpFromLine, label: 'Withdraw'         },
      { to: '/dashboard/withdraw/history', icon: DollarSign,      label: 'Withdraw History' },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/dashboard/tickets',       icon: Ticket,    label: 'Support Tickets' },
      { to: '/dashboard/announcements', icon: Megaphone, label: 'Announcements'   },
    ],
  },
]

function SidebarContent({ onClose = () => {} }) {
  const { user, logout } = useAuthStore()
  const [openGroup, setOpenGroup] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--sidebar-bg)' }}>
      {/* Logo area */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border)',
      }}>
        <Link to="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', textDecoration: 'none', padding: '0.25rem 0' }} onClick={onClose}>
          <img src="/logo.svg" alt="Novatrix Logo" style={{ height: 44 }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', letterSpacing: '0.15em', fontWeight: 800, marginLeft: '52px' }}>
            EXCHANGE CORE
          </span>
        </Link>
      </div>

      {/* User Area */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{
          padding: '1rem',
          borderRadius: '16px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)',
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
              {user?.name || 'Investor'}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, lineHeight: 1 }}>
              {user?.user_id}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              marginTop: '0.2rem', padding: '0.25rem 0.625rem',
              borderRadius: '8px', 
              background: user?.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: user?.status === 'active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
              color: user?.status === 'active' ? '#10b981' : '#ef4444',
              fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
              alignSelf: 'flex-start'
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
              {user?.status || 'INACTIVE'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.875rem' }}>
        {NAV_GROUPS.map(({ label, items }) => {
          const isOpen = openGroup === label;
          return (
            <div key={label || '_top'} style={{ marginBottom: label ? '0.5rem' : '1.25rem' }}>
              {label ? (
                <button 
                  onClick={() => setOpenGroup(isOpen ? null : label)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    width: '100%', background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', padding: '0.75rem 1rem', 
                    cursor: 'pointer', color: isOpen ? '#fff' : 'var(--text-faint)', 
                    fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderRadius: '8px', transition: 'all 0.2s', marginBottom: isOpen ? '0.25rem' : '0'
                  }}
                  onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.color = 'var(--text-faint)'; }}
                >
                  <span>{label}</span>
                  <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>
              ) : null}
              
              <div style={{ 
                display: (!label || isOpen) ? 'block' : 'none',
                paddingLeft: label ? '0.5rem' : '0'
              }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {items.map(({ to, icon: Icon, label: itemLabel }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === '/dashboard' || to === '/dashboard/earnings'}
                        onClick={onClose}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={18} />
                        <span>{itemLabel}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '1rem 0.875rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={logout}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-glow)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export default function MemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [announcementCount, setAnnouncementCount] = useState(0)
  const { user } = useAuthStore()
  const isImpersonating = useAuthStore((s) => s.isImpersonating)()
  const location = useLocation()

  useEffect(() => {
    api.get('/announcements')
      .then(({ data }) => {
        const dismissed = JSON.parse(localStorage.getItem('nvx_dismissed_announcements') || '[]')
        const unread = (data.announcements || []).filter((a) => !dismissed.includes(a.id))
        setAnnouncementCount(unread.length)
      })
      .catch(() => {})
  }, [])

  const getPageTitle = () => {
    const path = location.pathname.split('/').filter(Boolean)
    if (path.length === 1) return 'Market Snapshot'
    const last = path[path.length - 1]
    const map = {
      profile: 'Personal Profile', 'wallet-setup': 'Security Assets', kyc: 'Verification',
      topup: 'Capitalize Account', history: 'Transaction History', trade: 'Active Trading',
      'income-wallet': 'Profit Center', earnings: 'Yield Reports', genealogy: 'Alliance Network',
      withdraw: 'Asset Exit', tickets: 'Client Support', announcements: 'System Updates',
      daily: 'Daily Trading Profit', direct: 'Direct Referral Bonus', level: 'Team Level Bonus', reward: 'Performance Rewards', royalty: 'Monthly Royalty',
      transfer: 'Wallet to Wallet Transfer', activate: 'External ID Activation'
    }
    return map[last] || last.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--navy)' }}>
      <UrgentAnnouncementPopup />
      {isImpersonating && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, 
          background: 'linear-gradient(90deg, #f97316, #ef4444)', color: '#fff', 
          padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
          fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.02em', boxShadow: '0 4px 20px rgba(249,115,22,0.4)'
        }}>
          <ShieldAlert size={16} />
          <span>ADMINISTRATIVE IMPERSONATION ACTIVE — VIEWING PLATFORM AS {user?.name?.toUpperCase()} ({user?.user_id})</span>
          <button onClick={() => {
            // Restore admin Zustand session from the backup we made during impersonation
            const adminSession = localStorage.getItem('nvx_admin_backup_session')
            if (adminSession) localStorage.setItem('nvx_admin_session', adminSession)
            // Clean up member auth keys and all impersonation artifacts
            localStorage.removeItem('nvx_token')
            localStorage.removeItem('nvx_refresh')
            localStorage.removeItem('nvx_user')
            localStorage.removeItem('nvx_admin_backup_session')
            localStorage.removeItem('nvx_impersonator')
            window.location.href = '/admin/members'
          }} 
            style={{ background: '#fff', color: '#f97316', border: 'none', padding: '0.25rem 0.75rem', borderRadius: 6, fontSize: '0.625rem', fontWeight: 900, cursor: 'pointer' }}>
            EXIT & RETURN TO ADMIN
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 30,
        display: 'none',
      }} id="desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} className="fade-in">
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: 'var(--sidebar-width)',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border)',
            zIndex: 50,
          }} className="slide-in-left">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} id="main-content-area">
        {/* Top header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(8,13,26,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '0.5rem', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex',
              }}
              id="mobile-hamburger"
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }} id="breadcrumb-area">
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)', fontWeight: 600 }}>DASHBOARD</span>
              {location.pathname !== '/dashboard' && (
                <>
                  <ChevronDown size={12} style={{ color: 'var(--text-faint)', transform: 'rotate(-90deg)' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {getPageTitle()}
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/dashboard/announcements"
              style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '0.5rem', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex',
              }}
            >
              <Bell size={18} />
              {announcementCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 18, height: 18, borderRadius: '50%',
                  background: 'var(--red)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--navy)',
                }}>
                  {announcementCount > 9 ? '9+' : announcementCount}
                </span>
              )}
            </Link>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '0.4rem 0.875rem 0.4rem 0.5rem',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: '#fff',
              }}>
                {user?.name?.[0]?.toUpperCase() || 'M'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }} id="header-userid">
                {user?.user_id}
              </span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }} id="page-main">
          <div className="fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .slide-in-left { animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

        @media (min-width: 1024px) {
          #desktop-sidebar { display: block !important; }
          #main-content-area { margin-left: var(--sidebar-width); }
          #mobile-hamburger { display: none !important; }
        }
        @media (max-width: 1023px) {
          #breadcrumb-area { display: none !important; }
          #header-userid { display: none !important; }
          #page-main { padding: 1.25rem !important; }
        }
      `}</style>
    </div>
  )
}
