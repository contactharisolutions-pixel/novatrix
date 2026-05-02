import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Users, Calendar, PieChart as PieIcon, Activity } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, Spinner, Panel } from '../../components/member/ui'

const COLORS  = ['#00D4FF', '#6C3CE1', '#10B981']
const GRADIENTS = ['cyanGrad', 'purpleGrad', 'greenGrad']

export default function EarningsPage() {
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/earnings/summary'),
      api.get('/earnings/history'),
    ])
      .then(([sumRes, histRes]) => {
        setSummary(sumRes.data)
        setHistory(histRes.data.history || [])
      })
      .catch(() => toast.error('Could not load earnings data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const fmt = (n) => `$${(+n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  const pieData = [
    { name: 'Trading Profit', value: +(summary?.trading_income || 0) },
    { name: 'Direct Bonus',   value: +(summary?.direct_bonus   || 0) },
    { name: 'Level Bonus',    value: +(summary?.level_bonus    || 0) },
  ].filter((d) => d.value > 0)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1rem', color: 'var(--cyan)', fontWeight: 800 }}>{fmt(payload[0].value)}</p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Profit Reports" subtitle="Detailed breakdown of your daily earnings and team bonuses" />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--gap-md)' }}>
        <StatCard label="Total Earned"     value={fmt(summary?.total)}          icon={DollarSign} color="cyan"   />
        <StatCard label="Trading Profit"   value={fmt(summary?.trading_income)} icon={TrendingUp} color="green"  />
        <StatCard label="Direct Bonus"     value={fmt(summary?.direct_bonus)}   icon={Users}      color="purple" />
        <StatCard label="Level Bonus"      value={fmt(summary?.level_bonus)}    icon={Activity}   color="orange" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gap-lg)' }} id="earnings-layout">
        {/* Area chart — 30-day history */}
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Calendar size={18} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>Daily Profit — Last 30 Days</h3>
          </div>

          <div style={{ height: 300, width: '100%' }}>
            {history.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--cyan)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-faint)', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-faint)', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="earning"
                    stroke="var(--cyan)"
                    strokeWidth={3}
                    fill="url(#areaGrad)"
                    dot={{ fill: 'var(--cyan)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: 'var(--cyan)', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
                No earnings history found.
              </div>
            )}
          </div>
        </Panel>

        {/* Donut chart — breakdown */}
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <PieIcon size={18} style={{ color: 'var(--purple)' }} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>Profit Breakdown</h3>
          </div>

          {pieData.length > 0 ? (
            <>
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <defs>
                      {GRADIENTS.map((id, i) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={COLORS[i]} stopOpacity={1} />
                          <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={5}
                      stroke="none"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={`url(#${GRADIENTS[i % GRADIENTS.length]})`} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pieData.map((entry, i) => {
                  const pct = summary?.total > 0 ? ((entry.value / summary.total) * 100).toFixed(1) : 0
                  return (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{entry.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(entry.value)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginLeft: '0.5rem' }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
              No profit data found.
            </div>
          )}
        </Panel>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          #earnings-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
