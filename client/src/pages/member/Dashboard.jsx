import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, DollarSign, TrendingUp, ArrowUpFromLine,
  Users, Copy, ArrowRight, RefreshCw, Activity,
  Zap, UserPlus, BarChart3, TrendingDown, ShieldCheck,
  Share2, CheckCheck, UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore, { siteOrigin } from '../../store/useAuthStore'
import { Spinner, Badge, PageHeader, Panel, PanelTitle } from '../../components/member/ui'
import { CapitalHubTicker, ForexLiveGraph } from '../../components/member/DashboardWidgets'

const QUICK_ACTIONS = [
  { label: 'Add Funds',  to: '/dashboard/topup',     from: '#00d4ff', to_c: '#4f46e5' },
  { label: 'Trade Now',  to: '/dashboard/trade',     from: '#7c3aed', to_c: '#4f46e5' },
  { label: 'Withdraw',   to: '/dashboard/withdraw',  from: '#f97316', to_c: '#f59e0b' },
  { label: 'My Network', to: '/dashboard/genealogy', from: '#10b981', to_c: '#14b8a6' },
]

export default function Dashboard() {
  const { user, refreshUser }         = useAuthStore()
  const [stats,   setStats]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copied,  setCopied]          = useState(false)

  // Resolve referral_code — present in store after this patch;
  // fall back to user_id-derived code for sessions logged in before fix.
  const referralCode = user?.referral_code?.replace('NVX', '') || (user?.user_id ? `${user.user_id}` : '')
  const referralLink = `${siteOrigin()}/register?ref=${referralCode}`

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/member/dashboard')
      setStats(data.stats)
      // If referral_code is missing from the stored user (pre-fix sessions), refresh it
      if (!user?.referral_code && data.user?.referral_code) {
        refreshUser()
      }
    } catch {
      toast.error('Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopied(true)
        toast.success('Referral link copied!')
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => toast.error('Copy failed — please copy manually'))
  }

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Novatrix',
          text: `Join Novatrix with my referral link and start earning daily returns! Use code: ${referralCode}`,
          url: referralLink,
        })
      } catch (e) {
        if (e.name !== 'AbortError') toast.error('Share cancelled')
      }
    } else {
      // Fallback: copy if Web Share API not available
      copyReferral()
      toast('Sharing not supported — link copied instead', { icon: '📋' })
    }
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

      {/* SECTION 1: CAPITAL & GROWTH */}
      <div className="kpi-section">
        <div className="kpi-section-header">
          <div className="kpi-section-title-wrap">
            <div className="kpi-section-icon cyan-glow"><TrendingUp size={18} /></div>
            <div>
              <h2 className="kpi-section-title">Capital & Network Growth</h2>
              <p className="kpi-section-subtitle">Real-time performance metrics of your deposits and downline business</p>
            </div>
          </div>
        </div>
        <div className="kpi-grid-4">
          <div className="kpi-card border-cyan hover-cyan animate-fade-in">
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">My Total Top up</span>
                <div className="kpi-card-icon-small bg-cyan"><TrendingUp size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-cyan">{fmt(stats?.total_topup)}</h3>
                <span className="kpi-card-sub">Active Trade Packages</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-blue hover-blue animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Total Team</span>
                <div className="kpi-card-icon-small bg-blue"><Users size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-blue">{stats?.team_total ?? 0}</h3>
                <span className="kpi-card-sub">Recursive Downline Members</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-teal hover-teal animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Today's Business</span>
                <div className="kpi-card-icon-small bg-teal"><BarChart3 size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-teal">{fmt(stats?.today_business)}</h3>
                <span className="kpi-card-sub">Today's Team Volume (IST)</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-purple hover-purple animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Total Team Business</span>
                <div className="kpi-card-icon-small bg-purple"><BarChart3 size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-purple">{fmt(stats?.total_team_business)}</h3>
                <span className="kpi-card-sub">Lifetime Team Volume</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TEAM DYNAMICS */}
      <div className="kpi-section">
        <div className="kpi-section-header">
          <div className="kpi-section-title-wrap">
            <div className="kpi-section-icon purple-glow"><Users size={18} /></div>
            <div>
              <h2 className="kpi-section-title">Network Activity & Dynamics</h2>
              <p className="kpi-section-subtitle">Real-time monitoring of team membership activities and registration statuses</p>
            </div>
          </div>
        </div>
        <div className="kpi-grid-4">
          <div className="kpi-card border-green hover-green animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Total Active Team</span>
                <div className="kpi-card-icon-small bg-green"><ShieldCheck size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-green">{stats?.active_team ?? 0}</h3>
                <span className="kpi-card-sub">Active Trading Partners</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-indigo hover-indigo animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Today Total Joining</span>
                <div className="kpi-card-icon-small bg-indigo"><UserPlus size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-indigo">{stats?.today_joining ?? 0}</h3>
                <span className="kpi-card-sub">New Downline Signups</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-orange hover-orange animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Today's Active</span>
                <div className="kpi-card-icon-small bg-orange"><Zap size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-orange">{stats?.today_activation ?? 0}</h3>
                <span className="kpi-card-sub">First-Time Package Activations</span>
              </div>
            </div>
          </div>

          <div className="kpi-card border-rose hover-rose animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Today's Deactivate Joining</span>
                <div className="kpi-card-icon-small bg-rose"><UserX size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-rose">{stats?.today_deactivate_joining ?? 0}</h3>
                <span className="kpi-card-sub">Registered, Not Yet Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: REVENUE & COMMISSION ENGINE */}
      <div className="kpi-section">
        <div className="kpi-section-header">
          <div className="kpi-section-title-wrap">
            <div className="kpi-section-icon emerald-glow"><DollarSign size={18} /></div>
            <div>
              <h2 className="kpi-section-title">Revenue & Commission Engine</h2>
              <p className="kpi-section-subtitle">Real-time daily yield vs lifetime earnings across all bonus streams</p>
            </div>
          </div>
        </div>
        <div className="kpi-grid-3">
          {/* ROI Income */}
          <div className="kpi-double-card border-emerald hover-emerald animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="kpi-double-card-header">
              <div className="kpi-double-card-title-wrap">
                <div className="kpi-card-icon-small bg-emerald"><TrendingUp size={15} /></div>
                <span>ROI Trading Income</span>
              </div>
              <span className="kpi-badge bg-emerald-dim">Daily Yield</span>
            </div>
            <div className="kpi-double-card-body">
              <div className="kpi-income-row">
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Today's ROI</span>
                  <h3 className="kpi-income-value text-emerald">{fmt(stats?.today_roi)}</h3>
                </div>
                <div className="kpi-income-divider"></div>
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Total ROI</span>
                  <h4 className="kpi-income-value-sub">{fmt(stats?.total_roi)}</h4>
                </div>
              </div>
            </div>
            <div className="kpi-double-card-footer">
              <div className="kpi-progress-bar bg-emerald-glow">
                <div className="kpi-progress-fill bg-emerald" style={{ width: stats?.today_roi > 0 ? '100%' : '15%' }}></div>
              </div>
              <span className="kpi-card-footer-text">Daily ROI passive trading distributions</span>
            </div>
          </div>

          {/* Sponsor Income */}
          <div className="kpi-double-card border-violet hover-violet animate-fade-in" style={{ animationDelay: '0.45s' }}>
            <div className="kpi-double-card-header">
              <div className="kpi-double-card-title-wrap">
                <div className="kpi-card-icon-small bg-violet"><Users size={15} /></div>
                <span>Sponsor Direct Income</span>
              </div>
              <span className="kpi-badge bg-violet-dim">Referrals</span>
            </div>
            <div className="kpi-double-card-body">
              <div className="kpi-income-row">
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Today's Sponsor</span>
                  <h3 className="kpi-income-value text-violet">{fmt(stats?.today_sponsor_income)}</h3>
                </div>
                <div className="kpi-income-divider"></div>
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Total Sponsor</span>
                  <h4 className="kpi-income-value-sub">{fmt(stats?.total_sponsor_income)}</h4>
                </div>
              </div>
            </div>
            <div className="kpi-double-card-footer">
              <div className="kpi-progress-bar bg-violet-glow">
                <div className="kpi-progress-fill bg-violet" style={{ width: stats?.today_sponsor_income > 0 ? '100%' : '15%' }}></div>
              </div>
              <span className="kpi-card-footer-text">Direct referral active matching rewards</span>
            </div>
          </div>

          {/* Level Income */}
          <div className="kpi-double-card border-orange hover-orange animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="kpi-double-card-header">
              <div className="kpi-double-card-title-wrap">
                <div className="kpi-card-icon-small bg-orange"><Activity size={15} /></div>
                <span>Level Network Income</span>
              </div>
              <span className="kpi-badge bg-orange-dim">Unilevel</span>
            </div>
            <div className="kpi-double-card-body">
              <div className="kpi-income-row">
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Today's Level</span>
                  <h3 className="kpi-income-value text-orange">{fmt(stats?.today_level_income)}</h3>
                </div>
                <div className="kpi-income-divider"></div>
                <div className="kpi-income-col">
                  <span className="kpi-income-label">Total Level</span>
                  <h4 className="kpi-income-value-sub">{fmt(stats?.total_level_income)}</h4>
                </div>
              </div>
            </div>
            <div className="kpi-double-card-footer">
              <div className="kpi-progress-bar bg-orange-glow">
                <div className="kpi-progress-fill bg-orange" style={{ width: stats?.today_level_income > 0 ? '100%' : '15%' }}></div>
              </div>
              <span className="kpi-card-footer-text">Multi-tier deep network affiliate bonuses</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: LIQUIDITY & WALLETS */}
      <div className="kpi-section">
        <div className="kpi-section-header">
          <div className="kpi-section-title-wrap">
            <div className="kpi-section-icon amber-glow"><Wallet size={18} /></div>
            <div>
              <h2 className="kpi-section-title">Liquidity & Wallet Balances</h2>
              <p className="kpi-section-subtitle">Real-time wallet accounts, withdrawable reserves, and disbursement summaries</p>
            </div>
          </div>
        </div>
        <div className="kpi-grid-3">
          <div className="kpi-card border-green hover-green balance-card animate-fade-in" style={{ animationDelay: '0.55s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label text-dim">Withdraw Wallet</span>
                <div className="kpi-card-icon-small bg-green"><Wallet size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-green font-outfit">{fmt(stats?.income_wallet)}</h3>
                <span className="kpi-card-sub text-dim">Available profit for immediate withdrawal</span>
              </div>
              <div className="kpi-card-action-bar">
                <Link to="/dashboard/withdraw" className="kpi-card-action-link text-green">
                  <span>Withdraw Funds</span> <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          <div className="kpi-card border-purple hover-purple balance-card animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label text-dim">Fund Wallet</span>
                <div className="kpi-card-icon-small bg-purple"><DollarSign size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-purple font-outfit">{fmt(stats?.fund_wallet)}</h3>
                <span className="kpi-card-sub text-dim">Capital balance for packages and transfers</span>
              </div>
              <div className="kpi-card-action-bar">
                <Link to="/dashboard/topup" className="kpi-card-action-link text-purple">
                  <span>Add / Transfer Capital</span> <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          <div className="kpi-card border-red hover-red balance-card animate-fade-in" style={{ animationDelay: '0.65s' }}>
            <div className="kpi-card-inner">
              <div className="kpi-card-header">
                <span className="kpi-card-label text-dim">Total Withdrawal</span>
                <div className="kpi-card-icon-small bg-red"><TrendingDown size={15} /></div>
              </div>
              <div className="kpi-card-body">
                <h3 className="kpi-card-value text-red font-outfit">{fmt(stats?.total_withdraw)}</h3>
                <span className="kpi-card-sub text-dim">Total historical cashouts approved</span>
              </div>
              <div className="kpi-card-action-bar">
                <Link to="/dashboard/withdraw" className="kpi-card-action-link text-red">
                  <span>View Withdrawal Logs</span> <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
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
              value={referralLink}
              className="input mono"
              style={{ fontSize: '0.8125rem', flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
              onFocus={(e) => e.target.select()}
            />
            {/* Share button — uses Web Share API (mobile) or falls back to copy */}
            <button
              onClick={shareReferral}
              className="btn-secondary"
              title="Share referral link"
              style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
            {/* Copy button */}
            <button
              onClick={copyReferral}
              className="btn-primary"
              title="Copy referral link"
              style={{
                padding: '0.75rem 1.25rem', fontSize: '0.875rem', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: copied ? 'var(--green)' : undefined,
                transition: 'background 0.3s',
              }}
            >
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          {/* Show referral code separately for easy reference */}
          {referralCode && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--text-faint)' }}>
              Your referral code: <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'monospace' }}>{referralCode}</span>
            </p>
          )}
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
        /* Custom dashboard KPI sections */
        .kpi-section {
          display: flex;
          flex-direction: column;
          gap: var(--gap-xs);
          margin-bottom: var(--gap-md);
        }

        .kpi-section-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .kpi-section-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .kpi-section-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
        }

        /* Custom glow borders for icons */
        .cyan-glow { color: var(--cyan); border-color: rgba(0, 212, 255, 0.15); box-shadow: 0 0 12px rgba(0, 212, 255, 0.05); }
        .purple-glow { color: var(--purple); border-color: rgba(124, 58, 237, 0.15); box-shadow: 0 0 12px rgba(124, 58, 237, 0.05); }
        .emerald-glow { color: var(--green); border-color: rgba(16, 185, 129, 0.15); box-shadow: 0 0 12px rgba(16, 185, 129, 0.05); }
        .amber-glow { color: var(--amber); border-color: rgba(245, 158, 11, 0.15); box-shadow: 0 0 12px rgba(245, 158, 11, 0.05); }

        .kpi-section-title {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0;
          line-height: 1.2;
          font-family: 'Outfit', sans-serif;
        }

        .kpi-section-subtitle {
          font-size: 0.72rem;
          color: var(--text-faint);
          margin: 0.1rem 0 0 0;
          font-weight: 500;
        }

        /* Grids */
        .kpi-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--gap-md);
        }

        .kpi-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--gap-md);
        }

        @media (max-width: 1023px) {
          .kpi-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .kpi-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 639px) {
          .kpi-grid-4 { grid-template-columns: 1fr; }
          .kpi-grid-3 { grid-template-columns: 1fr; }
          #dash-quick { grid-template-columns: 1fr !important; }
        }

        /* Base Card Redesign */
        .kpi-card {
          background: linear-gradient(135deg, var(--navy-card) 0%, var(--navy-elevated) 100%);
          border-radius: var(--radius-md);
          padding: 1.15rem 1.25rem;
          transition: var(--transition-normal);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .kpi-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.02) 0%, transparent 70%);
          pointer-events: none;
        }

        .kpi-card-inner {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          height: 100%;
        }

        .kpi-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-card-label {
          font-size: 0.7rem;
          color: var(--text-faint);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kpi-card-icon-small {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
        }

        /* Accent bg classes for icons */
        .bg-cyan { background: rgba(0, 212, 255, 0.08); color: var(--cyan); border-color: rgba(0, 212, 255, 0.15); }
        .bg-blue { background: rgba(59, 130, 246, 0.08); color: #3b82f6; border-color: rgba(59, 130, 246, 0.15); }
        .bg-teal { background: rgba(20, 184, 166, 0.08); color: #14b8a6; border-color: rgba(20, 184, 166, 0.15); }
        .bg-purple { background: rgba(124, 58, 237, 0.08); color: var(--purple); border-color: rgba(124, 58, 237, 0.15); }
        .bg-green { background: rgba(16, 185, 129, 0.08); color: var(--green); border-color: rgba(16, 185, 129, 0.15); }
        .bg-indigo { background: rgba(99, 102, 241, 0.08); color: #6366f1; border-color: rgba(99, 102, 241, 0.15); }
        .bg-orange { background: rgba(249, 115, 22, 0.08); color: var(--orange); border-color: rgba(249, 115, 22, 0.15); }
        .bg-rose { background: rgba(244, 63, 94, 0.08); color: #f43f5e; border-color: rgba(244, 63, 94, 0.15); }
        .bg-emerald { background: rgba(16, 185, 129, 0.08); color: var(--green); border-color: rgba(16, 185, 129, 0.15); }
        .bg-violet { background: rgba(139, 92, 246, 0.08); color: #a78bfa; border-color: rgba(139, 92, 246, 0.15); }
        .bg-red { background: rgba(239, 68, 68, 0.08); color: var(--red); border-color: rgba(239, 68, 68, 0.15); }

        .kpi-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .kpi-card-value {
          font-size: 1.35rem;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          line-height: 1.1;
          margin: 0;
        }

        .kpi-card-sub {
          font-size: 0.7rem;
          color: var(--text-faint);
          font-weight: 500;
        }

        /* Card custom active glow borders */
        .border-cyan { border-color: rgba(0, 212, 255, 0.06); }
        .border-blue { border-color: rgba(59, 130, 246, 0.06); }
        .border-teal { border-color: rgba(20, 184, 166, 0.06); }
        .border-purple { border-color: rgba(124, 58, 237, 0.06); }
        .border-green { border-color: rgba(16, 185, 129, 0.06); }
        .border-indigo { border-color: rgba(99, 102, 241, 0.06); }
        .border-orange { border-color: rgba(249, 115, 22, 0.06); }
        .border-rose { border-color: rgba(244, 63, 94, 0.06); }
        .border-emerald { border-color: rgba(16, 185, 129, 0.06); }
        .border-violet { border-color: rgba(139, 92, 246, 0.06); }
        .border-red { border-color: rgba(239, 68, 68, 0.06); }

        /* Hover effects */
        .kpi-card:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg, var(--navy-card) 0%, var(--navy-elevated) 80%);
        }

        .hover-cyan:hover { border-color: var(--cyan); box-shadow: 0 4px 20px rgba(0, 212, 255, 0.08); }
        .hover-blue:hover { border-color: #3b82f6; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.08); }
        .hover-teal:hover { border-color: #14b8a6; box-shadow: 0 4px 20px rgba(20, 184, 166, 0.08); }
        .hover-purple:hover { border-color: var(--purple); box-shadow: 0 4px 20px rgba(124, 58, 237, 0.08); }
        .hover-green:hover { border-color: var(--green); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08); }
        .hover-indigo:hover { border-color: #6366f1; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08); }
        .hover-orange:hover { border-color: var(--orange); box-shadow: 0 4px 20px rgba(249, 115, 22, 0.08); }
        .hover-rose:hover { border-color: #f43f5e; box-shadow: 0 4px 20px rgba(244, 63, 94, 0.08); }
        .hover-emerald:hover { border-color: var(--green); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08); }
        .hover-violet:hover { border-color: #a78bfa; box-shadow: 0 4px 20px rgba(124, 58, 237, 0.08); }
        .hover-red:hover { border-color: var(--red); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08); }

        /* Text colors */
        .text-cyan { color: var(--cyan); }
        .text-blue { color: #3b82f6; }
        .text-teal { color: #14b8a6; }
        .text-purple { color: #c084fc; }
        .text-green { color: var(--green); }
        .text-indigo { color: #818cf8; }
        .text-orange { color: var(--orange); }
        .text-rose { color: #fb7185; }
        .text-emerald { color: #34d399; }
        .text-violet { color: #c084fc; }
        .text-red { color: #f87171; }

        .font-outfit { font-family: 'Outfit', sans-serif; }

        /* Redesigned Double-decker KPI Cards */
        .kpi-double-card {
          background: linear-gradient(135deg, var(--navy-card) 0%, var(--navy-elevated) 100%);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          transition: var(--transition-normal);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .kpi-double-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.02) 0%, transparent 70%);
          pointer-events: none;
        }

        .kpi-double-card:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg, var(--navy-card) 0%, var(--navy-elevated) 80%);
        }

        .kpi-double-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 0.5rem;
        }

        .kpi-double-card-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .kpi-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }

        .bg-emerald-dim { background: rgba(16, 185, 129, 0.08); color: var(--green); }
        .bg-violet-dim { background: rgba(139, 92, 246, 0.08); color: #c084fc; }
        .bg-orange-dim { background: rgba(249, 115, 22, 0.08); color: var(--orange); }

        .kpi-double-card-body {
          padding: 0.15rem 0;
        }

        .kpi-income-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-income-col {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
        }

        .kpi-income-col:last-child {
          padding-left: 1.25rem;
        }

        .kpi-income-divider {
          width: 1px;
          height: 38px;
          background: rgba(255, 255, 255, 0.06);
        }

        .kpi-income-label {
          font-size: 0.68rem;
          color: var(--text-faint);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .kpi-income-value {
          font-size: 1.35rem;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          line-height: 1;
          margin: 0;
        }

        .kpi-income-value-sub {
          font-size: 1.15rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          line-height: 1;
          margin: 0;
        }

        .kpi-double-card-footer {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-top: auto;
        }

        .kpi-progress-bar {
          height: 4px;
          border-radius: 2px;
          width: 100%;
          overflow: hidden;
        }

        .kpi-progress-fill {
          height: 100%;
          border-radius: 2px;
        }

        .kpi-progress-bar.bg-emerald-glow { background: rgba(16, 185, 129, 0.08); }
        .kpi-progress-bar.bg-violet-glow { background: rgba(139, 92, 246, 0.08); }
        .kpi-progress-bar.bg-orange-glow { background: rgba(249, 115, 22, 0.08); }

        .kpi-card-footer-text {
          font-size: 0.65rem;
          color: var(--text-faint);
          font-weight: 500;
        }

        /* Section 4 Balance Card Specific Styles */
        .balance-card {
          padding-bottom: 0;
        }

        .kpi-card-action-bar {
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding: 0.75rem 0;
          margin-top: 0.25rem;
          display: flex;
        }

        .kpi-card-action-link {
          font-size: 0.72rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-decoration: none;
          transition: var(--transition-fast);
        }

        .kpi-card-action-link:hover {
          filter: brightness(1.2);
          transform: translateX(2px);
        }

        /* Micro animation keyframes */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  )
}
