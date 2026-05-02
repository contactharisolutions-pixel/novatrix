import { useEffect, useState } from 'react'
import { Award, Zap, BarChart, Users, Star, Info, Target, Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Panel, Spinner, Badge } from '../../components/member/ui'
import IncomeReportPage from './IncomeReportPage'

export default function RoyaltyIncome() {
  const [perf, setPerf] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPerf = async () => {
    try {
      const { data } = await api.get('/member/performance')
      setPerf(data)
    } catch (err) {
      toast.error('Failed to load royalty performance')
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
        title="Monthly Royalty Income" 
        subtitle="Shared global turnover rewards for the platform's elite leaders"
      />

      {/* Royalty Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--gap-md)' }}>
        <Panel style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.05), rgba(249,115,22,0.05))', border: '1px solid rgba(234,179,8,0.2)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Gem size={28} style={{ color: '#EAB308' }} />
              </div>
              <div>
                 <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Current Royalty Level</p>
                 <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EAB308' }}>{perf?.current_royalty || 'Not Qualified'}</h3>
              </div>
           </div>
        </Panel>

        <Panel style={{ background: 'rgba(255,255,255,0.02)' }}>
           <div style={{ display: 'flex', gap: '1rem' }}>
              <Info size={20} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: '0.25rem' }} />
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Royalty income is distributed on the <strong>1st of every month</strong>. It is calculated as a percentage of the total company turnover shared among all qualifiers of each rank.
              </p>
           </div>
        </Panel>
      </div>

      {/* Royalty Milestones */}
      <Panel>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Target size={20} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Qualification Progress</h3>
         </div>
         <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
               <thead>
                  <tr>
                     <th>ROYALTY RANK</th>
                     <th>REQUIRED BUSINESS</th>
                     <th>POOL SHARE</th>
                     <th>LEG 1 (40%)</th>
                     <th>LEG 2 (30%)</th>
                     <th>LEG 3 (30%)</th>
                     <th style={{ textAlign: 'right' }}>ELIGIBILITY</th>
                  </tr>
               </thead>
               <tbody>
                  {perf?.royalty_progress?.map((r) => (
                    <tr key={r.id} style={{ opacity: r.achieved ? 1 : 0.6 }}>
                       <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                             <Award size={16} style={{ color: r.achieved ? '#EAB308' : 'var(--text-faint)' }} />
                             <span style={{ fontWeight: 800, color: r.achieved ? 'var(--text-primary)' : 'var(--text-muted)' }}>{r.name}</span>
                          </div>
                       </td>
                       <td style={{ fontWeight: 700 }}>{fmt(r.target)}</td>
                       <td>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 800 }}>
                             {r.percent}% Pool
                          </span>
                       </td>
                       <td style={{ fontSize: '0.75rem' }}>{fmt(perf?.legs?.leg1)} / {fmt(0.4*r.target)}</td>
                       <td style={{ fontSize: '0.75rem' }}>{fmt(perf?.legs?.leg2)} / {fmt(0.3*r.target)}</td>
                       <td style={{ fontSize: '0.75rem' }}>{fmt(perf?.legs?.leg3)} / {fmt(0.3*r.target)}</td>
                       <td style={{ textAlign: 'right' }}>
                          {r.achieved ? (
                            <Badge status="Qualified" />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 600 }}>In Progress</span>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Panel>

      <IncomeReportPage 
        type="royalty" 
        title="Royalty Payout History" 
        subtitle="Monthly distributions from global turnover pools"
        icon={Award}
      />
    </div>
  )
}
