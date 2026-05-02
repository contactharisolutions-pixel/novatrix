import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, DollarSign, TrendingUp, ArrowUpFromLine,
  Users, Copy, ArrowRight, RefreshCw, Activity,
  Zap, UserPlus, BarChart3, TrendingDown, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../store/useAuthStore'
import { StatCard, Spinner, Badge, PageHeader, Panel, PanelTitle } from '../../components/member/ui'
import { CapitalHubTicker, ForexLiveGraph } from '../../components/member/DashboardWidgets'

const QUICK_ACTIONS = [
  { label: 'Add Funds',  to: '/dashboard/topup',     from: '#00d4ff', to_c: '#4f46e5' },
  { label: 'Trade Now',  to: '/dashboard/trade',     from: '#7c3aed', to_c: '#4f46e5' },
  { label: 'Withdraw',   to: '/dashboard/withdraw',  from: '#f97316', to_c: '#f59e0b' },
  { label: 'My Network', to: '/dashboard/genealogy', from: '#10b981', to_c: '#14b8a6' },
]

export default function Dashboard() {
  const { user }                  = useAuthStore()
  const [stats,   setStats]       = useState(null)
  const [loading, setLoading]     = useState(true)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/member/dashboard')
      setStats(data.stats)
    } catch {
      toast.error('Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const copyReferral = () => {
    const link = `${window.location.origin}/register?ref=${user?.referral_code || ''}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  const fmt = (n) => `$${(+n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      {/* Capital Hub Ticker */}
      <div style={{ margin: '0 -2rem 0 -2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border)' }}>
        <CapitalHubTicker />
      </div>

      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Investor'} 👋`}
        subtitle="Operational Performance Overview"
        action={
          <button
            onClick={fetchDashboard}
            className="btn-secondary"
            style={{ padding: '0.625rem 1.125rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} /> <span>Refresh Dashboard</span>
          </button>
        }
      />

      {/* 9 KPI Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 'var(--gap-md)' }} id="dash-stats">
        {/* Team Stats */}
        <StatCard label="Total Team"         value={stats?.team_total ?? 0}        icon={Users}          color="cyan"   sub="Total downline members" />
        <StatCard label="Total Active Team"  value={stats?.active_team ?? 0}       icon={ShieldCheck}     color="green"  sub="Active trading partners" />
        <StatCard label="Today's Joining"    value={stats?.today_joining ?? 0}     icon={UserPlus}       color="purple" sub="New members today" />
        
        {/* Daily Stats */}
        <StatCard label="Today's Business"   value={fmt(stats?.today_business)}    icon={BarChart3}      color="cyan"   sub="Total team volume today" />
        <StatCard label="Today's Activation" value={stats?.today_activation ?? 0}  icon={Zap}            color="orange" sub="New activations today" />
        <StatCard label="Withdraw Wallet"    value={fmt(stats?.income_wallet)}     icon={Wallet}         color="green"  sub="Available profit" />
        
        {/* Wallet Stats */}
        <StatCard label="Fund Wallet"        value={fmt(stats?.fund_wallet)}       icon={DollarSign}     color="purple" sub="Capital for activation" />
        <StatCard label="Total Topup"        value={fmt(stats?.total_topup)}       icon={TrendingUp}     color="cyan"   sub="Lifetime deposits" />
        <StatCard label="Total Withdrawal"   value={fmt(stats?.total_withdraw)}    icon={TrendingDown}   color="red"    sub="Lifetime cashouts" />
      </div>

      {/* Quick Links Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--gap-md)' }} id="dash-quick">
        {QUICK_ACTIONS.map(({ label, to, from, to_c }) => (
          <Link
            key={label}
            to={to}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '0.75rem', padding: '1.5rem',
              background: `linear-gradient(135deg, ${from}, ${to_c})`,
              borderRadius: 'var(--radius-lg)', color: '#fff', fontSize: '1rem', fontWeight: 800,
              textDecoration: 'none', transition: 'var(--transition-normal)',
              boxShadow: `0 8px 24px ${from}30`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' }}
          >
            <span>{label}</span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: 10, display: 'flex' }}>
              <ArrowRight size={18} />
            </div>
          </Link>
        ))}
      </div>

      {/* Referral & Graph Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--gap-md)' }}>
        {/* Referral Panel */}
        <Panel style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.03), rgba(124,58,237,0.03))',
          border: '1px solid var(--border-cyan)',
        }}>
          <PanelTitle icon={Copy}>Quick Share Referral Link</PanelTitle>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              readOnly
              value={`${window.location.origin}/register?ref=${user?.referral_code || ''}`}
              className="input mono"
              style={{ fontSize: '0.8125rem', flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
            />
            <button
              onClick={copyReferral}
              className="btn-primary"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', flexShrink: 0 }}
            >
              <Copy size={14} /> <span>Copy</span>
            </button>
          </div>
        </Panel>

        {/* Forex Live Graph */}
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
             <PanelTitle icon={TrendingUp}>Market Live — BTC/USD Real-time Analysis</PanelTitle>
          </div>
          <ForexLiveGraph symbol="BITSTAMP:BTCUSD" />
        </Panel>
      </div>

      <style>{`
        @media (max-width: 639px) {
          #dash-quick { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) {
          #dash-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          #dash-stats { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
