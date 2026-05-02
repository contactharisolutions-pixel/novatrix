import { useEffect, useState } from 'react'
import { Trophy, ShieldCheck, Star, Clock, Info, CheckCircle2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Panel, Spinner, Badge } from '../../components/member/ui'
import IncomeReportPage from './IncomeReportPage'

export default function RewardIncome() {
  const [perf, setPerf] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPerf = async () => {
    try {
      const { data } = await api.get('/member/performance')
      setPerf(data)
    } catch (err) {
      toast.error('Failed to load performance stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPerf() }, [])

  if (loading) return <Spinner />

  const fmt = (n) => `$${(+n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader 
        title="Performance Rewards & Rank" 
        subtitle="Track your milestones and unlock lifetime bonuses"
      />

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--gap-md)' }}>
        <Panel style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(124,58,237,0.05))', border: '1px solid var(--border-cyan)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Star size={24} style={{ color: 'var(--cyan)' }} />
              </div>
              <div>
                 <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Current Rank</p>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{perf?.current_rank || 'No Rank'}</h3>
              </div>
           </div>
        </Panel>

        <Panel style={{ background: 'rgba(255,255,255,0.02)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--purple-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Trophy size={24} style={{ color: 'var(--purple)' }} />
              </div>
              <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Total Team Business</p>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{fmt(perf?.legs?.total)}</h3>
              </div>
           </div>
        </Panel>
      </div>

      {/* Leg Distribution Card */}
      <Panel>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <ShieldCheck size={20} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Leg-wise Distribution (40/30/30 Rule)</h3>
         </div>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {[
              { label: 'Leg 1 (Max 40%)', val: perf?.legs?.leg1, color: 'var(--cyan)' },
              { label: 'Leg 2 (Max 30%)', val: perf?.legs?.leg2, color: 'var(--purple)' },
              { label: 'Leg 3 (Max 30%)', val: perf?.legs?.leg3, color: 'var(--green)' },
            ].map(l => (
              <div key={l.label}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: '0.5rem' }}>{l.label}</p>
                <div style={{ fontSize: '1.125rem', fontWeight: 900, color: l.color }}>{fmt(l.val)}</div>
              </div>
            ))}
         </div>
      </Panel>

      {/* Rewards Milestones List */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <Clock size={20} style={{ color: 'var(--orange)' }} />
           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Reward Milestones</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>RANK NAME</th>
                <th>TARGET BUSINESS</th>
                <th>REWARD AMOUNT</th>
                <th>LEG STATUS</th>
                <th style={{ textAlign: 'right' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {perf?.reward_progress?.map((r) => {
                const isNext = r.id === (perf?.current_rank_id || 0) + 1;
                return (
                  <tr key={r.id} style={{ opacity: r.achieved ? 1 : 0.6, background: isNext ? 'rgba(0,212,255,0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: r.achieved ? 'var(--green-glow)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           {r.achieved ? <CheckCircle2 size={16} style={{ color: 'var(--green)' }} /> : <Lock size={16} style={{ color: 'var(--text-faint)' }} />}
                        </div>
                        <span style={{ fontWeight: 800, color: r.achieved ? 'var(--text-primary)' : 'var(--text-muted)' }}>{r.name}</span>
                        {isNext && <Badge status="Next Goal" />}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(r.target)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--cyan)' }}>{fmt(r.reward)}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        {r.achieved ? 'Criteria Met' : `Req: ${fmt(0.4*r.target)} / ${fmt(0.3*r.target)} / ${fmt(0.3*r.target)}`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.achieved ? (
                        <span style={{ color: 'var(--green)', fontSize: '0.75rem', fontWeight: 800 }}>COMPLETED</span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', fontWeight: 600 }}>LOCKED</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <IncomeReportPage 
        type="reward" 
        title="Reward History" 
        subtitle="Recent performance bonus payouts"
        icon={Trophy}
      />
    </div>
  )
}
