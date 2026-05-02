import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, ArrowUpFromLine, ShieldCheck,
  Ticket, Megaphone, Settings, FileBarChart, LogOut, Menu, X,
  TrendingUp, ChevronRight, Shield, Activity, Network,
} from 'lucide-react'
import useAdminStore from '../store/useAdminStore'

const NAV = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',       exact: true },
  { to: '/admin/members',      icon: Users,           label: 'Members'                      },
  { to: '/admin/deposits',     icon: CreditCard,      label: 'Deposits'                     },
  { to: '/admin/withdrawals',  icon: ArrowUpFromLine, label: 'Withdrawals'                  },
  { to: '/admin/kyc',          icon: ShieldCheck,     label: 'KYC Queue'                    },
  { to: '/admin/tickets',      icon: Ticket,          label: 'Support Tickets'              },
  { to: '/admin/announcements',icon: Megaphone,       label: 'Announcements'                },
  { to: '/admin/settings',     icon: Settings,        label: 'Settings'                     },
  { to: '/admin/reports',      icon: FileBarChart,    label: 'Export Hub'                   },
  { to: '/admin/income-reports', icon: Activity,      label: 'Income Auditing'              },
  { to: '/admin/genealogy',    icon: Network,         label: 'Network Tree'                 },
]

function Sidebar({ onClose = () => {} }) {
  const { admin, logout } = useAdminStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border)',
      }}>
        <Link to="/admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', textDecoration: 'none', padding: '0.25rem 0' }} onClick={onClose}>
          <img src="/logo.svg" alt="Novatrix Logo" style={{ height: 44 }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--orange)', letterSpacing: '0.15em', fontWeight: 800, marginLeft: '52px' }}>
            ADMIN CORE
          </span>
        </Link>
      </div>

      {/* Admin Profile Area */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(249,115,22,0.04)',
          border: '1px solid rgba(249,115,22,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--orange), #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
          }}>
            {admin?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {admin?.name || 'Administrator'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.125rem' }}>
              {admin?.role || 'Superuser'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.875rem' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                onClick={onClose}
                className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div style={{ padding: '1rem 0.875rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={logout}
          className="admin-nav-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
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

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { admin } = useAdminStore()
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname.replace('/admin', '').split('/').filter(Boolean)
    if (!path.length) return 'System Overview'
    const map = {
      members: 'Member Directory', deposits: 'Deposit Management', withdrawals: 'Withdrawal Queue',
      kyc: 'Identity Verification', tickets: 'Support Center', announcements: 'System Broadcasts',
      settings: 'Global Configuration', reports: 'Financial Export Hub', 'income-reports': 'Income Auditing',
      genealogy: 'Network Visualization',
    }
    return map[path[0]] || path[0].replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--navy)' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 30,
        display: 'none',
      }} id="admin-desktop-sidebar">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} className="fade-in">
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border)', zIndex: 50,
          }} className="slide-in-left">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} id="admin-main-area">
        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(6,11,23,0.8)',
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
              id="admin-hamburger"
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }} id="admin-breadcrumb">
              <Shield size={14} style={{ color: 'var(--orange)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)', fontWeight: 600 }}>ADMIN</span>
              <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                {getPageTitle()}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '0.4rem 0.875rem 0.4rem 0.5rem',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--orange), #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: '#fff',
            }}>
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }} id="admin-email-display">
              {admin?.email}
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }} id="admin-page-main">
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
          #admin-desktop-sidebar { display: block !important; }
          #admin-main-area { margin-left: var(--sidebar-width); }
          #admin-hamburger { display: none !important; }
        }
        @media (max-width: 1023px) {
          #admin-email-display { display: none !important; }
          #admin-page-main { padding: 1.25rem !important; }
        }
      `}</style>
    </div>
  )
}
