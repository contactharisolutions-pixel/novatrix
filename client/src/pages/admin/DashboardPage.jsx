import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, CreditCard, ArrowUpFromLine, ShieldCheck,
  Ticket, TrendingUp, AlertCircle, Activity,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminStatCard, AdminSpinner, Panel, Badge } from '../../components/admin/ui'

const PENDING_LINKS = [
  { key: 'deposits',    label: 'Pending Deposits',    to: '/admin/deposits?status=pending',    accent: '#f59e0b', icon: CreditCard    },
  { key: 'withdrawals', label: 'Pending Withdrawals', to: '/admin/withdrawals?status=pending', accent: '#f97316', icon: ArrowUpFromLine },
  { key: 'kyc',         label: 'KYC Reviews',         to: '/admin/kyc?status=pending',         accent: '#3b82f6', icon: ShieldCheck   },
  { key: 'tickets',     label: 'Open Tickets',        to: '/admin/tickets?status=open',        accent: '#7c3aed', icon: Ticket        },
]

export default function AdminDashboard() {
  const [data,    setData]    = useState(null)
  const [roi,     setRoi]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.get('/dashboard'), adminApi.get('/reports/roi')])
      .then(([dashRes, roiRes]) => {
        setData(dashRes.data)
        setRoi(roiRes.data.roi_history || [])
      })
      .catch(() => toast.error('Could not load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AdminSpinner />
  if (!data) return (
    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-faint)' }}>
      <p style={{ fontSize: '1rem', fontWeight: 600 }}>Could not load dashboard data. Please refresh the page.</p>
    </div>
  )

  const { members, pending_actions, financials } = data

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--navy-card)', border: '1px solid var(--border-light)',
        borderRadius: 12, padding: '0.875rem 1.125rem', fontSize: '0.8125rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <p style={{ color: 'var(--text-faint)', marginBottom: '0.375rem', fontWeight: 600 }}>{label}</p>
        <p style={{ color: 'var(--orange)', fontWeight: 800, fontSize: '1rem' }}>${payload[0].value?.toLocaleString()}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Admin Dashboard" subtitle="Overview of platform users and financial stats" />

      {/* Primary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--gap-md)' }} id="admin-stat-grid">
        <AdminStatCard label="Total Users"   value={members.total.toLocaleString()}         icon={Users}      color="orange" sub="Total registrations" />
        <AdminStatCard label="Active Users"  value={members.active.toLocaleString()}        icon={Activity}   color="green"  sub="Verified and trading" />
        <AdminStatCard label="New This Week" value={members.new_this_week.toLocaleString()} icon={TrendingUp} color="blue"   sub="Recent registrations" />
        <AdminStatCard
          label="Total Deposits"
          value={`$${(+financials.total_deposits).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={CreditCard}
          color="purple"
          sub="Total money deposited"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--gap-md)' }} id="admin-mid-grid">
        {/* Pending Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <AlertCircle size={18} style={{ color: 'var(--orange)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pending Actions</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--gap-sm)' }} id="admin-pending-grid">
            {PENDING_LINKS.map(({ key, label, to, accent, icon: Icon }) => (
              <Link
                key={key}
                to={to}
                className="fade-in"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'var(--navy-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '1.25rem',
                  textDecoration: 'none', transition: 'var(--transition-normal)',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = accent }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${accent}10`, border: `1px solid ${accent}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: accent }} />
                </div>
                <div>
                  <p style={{ fontSize: '1.625rem', fontWeight: 900, color: accent, lineHeight: 1, fontFamily: 'Outfit, sans-serif' }}>
                    {pending_actions[key]}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                  </p>
                </div>
                {pending_actions[key] > 0 && (
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Financial velocity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Financial Summary</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gap-sm)' }} id="admin-fin-grid">
            {[
              { label: 'Total Deposits',    value: financials.total_deposits,   color: 'var(--green)'  },
              { label: 'Total Withdrawals', value: financials.total_withdrawals, color: 'var(--red)'    },
              { label: 'Profits Paid',     value: financials.total_bonuses,    color: 'var(--orange)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--navy-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center',
                transition: 'var(--transition-normal)',
              }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color, marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${(+value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROI Distribution Chart */}
      <Panel style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Activity size={18} style={{ color: 'var(--orange)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Profit Payout Chart</h3>
          </div>
          <Badge status="LIVE" />
        </div>
        {roi.length > 0 ? (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roi} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--orange)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--orange)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-faint)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5, 10)} dy={10} />
                <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="var(--orange)" strokeWidth={3} fill="url(#roiGrad)" dot={false} activeDot={{ r: 6, stroke: 'var(--navy)', strokeWidth: 2, fill: 'var(--orange)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-faint)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Awaiting next distribution cycle data...</p>
          </div>
        )}
      </Panel>

      <style>{`
        @media (max-width: 639px) {
          #admin-stat-grid { grid-template-columns: 1fr !important; }
          #admin-pending-grid { grid-template-columns: 1fr !important; }
          #admin-fin-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          #admin-pending-grid { grid-template-columns: repeat(2, 1fr) !important; }
          #admin-fin-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          #admin-stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
          #admin-pending-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (min-width: 1280px) {
          #admin-mid-grid { grid-template-columns: 1.2fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
