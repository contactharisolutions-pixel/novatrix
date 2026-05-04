import { useState, useEffect } from 'react'
import { Download, FileBarChart, Loader2, TrendingUp, Users, Wallet, CreditCard, Activity, Database, FileSpreadsheet, Search, Filter, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, Panel, AdminTable, AdminSpinner } from '../../components/admin/ui'

const REPORTS = [
  { key: 'members', label: 'Entity Registry', desc: 'Full export of registered members, balances, and sponsors.', icon: Users, color: 'var(--cyan)', badge: 'REGISTRY' },
  { key: 'deposits', label: 'Ingress History', desc: 'Audit trail of capital injections and tx hashes.', icon: Database, color: 'var(--green)', badge: 'FINANCIAL' },
  { key: 'withdrawals', label: 'Liquidation Log', desc: 'Detailed registry of asset exits and settlements.', icon: CreditCard, color: 'var(--orange)', badge: 'SETTLEMENT' },
  { key: 'bonuses', label: 'Commission Nexus', desc: 'Audit of all yield distributions and team bonuses.', icon: Activity, color: 'var(--purple)', badge: 'INCENTIVE' },
]

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [format, setFormat] = useState('excel') // Default to excel as requested
  
  // Business Reports State
  const [bizData, setBizData] = useState([])
  const [bizLoading, setBizLoading] = useState(false)
  const [bizSearch, setBizSearch] = useState('')

  const download = async (type) => {
    setDownloading(type)
    try {
      const res = await adminApi.get('/reports/csv', {
        params: { type, from, to, format },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      const ext = format === 'excel' ? 'xlsx' : 'csv'
      link.href = url
      link.download = `novatrix-${type}-report-${new Date().toISOString().slice(0, 10)}.${ext}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${type.toUpperCase()} export complete.`)
    } catch { toast.error('Report generation failed.') }
    finally { setDownloading(null) }
  }

  const loadBusiness = async () => {
    setBizLoading(true)
    try {
      const { data } = await adminApi.get('/reports/business', { params: { search: bizSearch } })
      setBizData(data.reports || [])
    } catch { toast.error('Failed to load business intelligence.') }
    finally { setBizLoading(false) }
  }

  useEffect(() => {
    loadBusiness()
  }, [])

  const fmt = (n) => `$${(+n || 0).toLocaleString()}`

  const BIZ_COLS = [
    { key: 'user_id', label: 'Member ID', render: (v) => <span style={{ fontWeight: 800, color: 'var(--cyan)' }}>{v}</span> },
    { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { key: 'leg1', label: 'Strong Leg', render: (v) => <span style={{ color: 'var(--green)', fontWeight: 800 }}>{fmt(v)}</span> },
    { key: 'leg2', label: 'Leg 2', render: (v) => <span style={{ color: 'var(--purple)', fontWeight: 700 }}>{fmt(v)}</span> },
    { key: 'leg3', label: 'Other Legs', render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{fmt(v)}</span> },
    { key: 'totalTeam', label: 'Total Team Biz', render: (v) => <span style={{ fontWeight: 900, color: 'var(--text-primary)' }}>{fmt(v)}</span> },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Intelligence Nexus" subtitle="Deep-level data analytics and ecosystem reporting" />

      {/* Date Filters Panel */}
      <Panel style={{ border: '1px solid var(--border-cyan)', background: 'rgba(0,212,255,0.02)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Filter size={18} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Global Date Filter</h3>
         </div>
         <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
               <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.5rem', fontWeight: 700 }}>FROM DATE</label>
               <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
               <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.5rem', fontWeight: 700 }}>TO DATE</label>
               <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
               <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.5rem', fontWeight: 700 }}>EXPORT FORMAT</label>
               <select value={format} onChange={e => setFormat(e.target.value)} className="input">
                  <option value="excel">Microsoft Excel (.xlsx)</option>
                  <option value="csv">Standard CSV (.csv)</option>
               </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
               <button onClick={() => { setFrom(''); setTo(''); setFormat('excel'); }} className="btn-secondary" style={{ height: 44, padding: '0 1.25rem' }}>RESET</button>
            </div>
         </div>
      </Panel>

      {/* Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--gap-md)' }}>
        {REPORTS.map(({ key, label, desc, icon: Icon, color, badge }) => (
          <div key={key} style={{ 
            padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border)', transition: 'var(--transition-normal)', position: 'relative', overflow: 'hidden' 
          }} className="hover-glow">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Icon size={20} style={{ color }} />
              </div>
              <span style={{ fontSize: '0.625rem', fontWeight: 900, padding: '0.25rem 0.625rem', borderRadius: 100, background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', letterSpacing: '0.05em' }}>{badge}</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{label}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem', height: '3.2rem', overflow: 'hidden' }}>{desc}</p>
            <button
              onClick={() => download(key)}
              disabled={downloading === key}
              className="btn-secondary"
              style={{ width: '100%', height: 44, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {downloading === key
                ? <><Loader2 size={16} className="animate-spin" /> GENERATING…</>
                : <><Download size={16} /> EXPORT {format.toUpperCase()}</>}
            </button>
          </div>
        ))}
      </div>

      {/* Business Analysis Section */}
      <div style={{ marginTop: 'var(--gap-lg)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <TrendingUp size={24} style={{ color: 'var(--cyan)' }} />
               <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>Team Business Intelligence</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
               <div style={{ position: 'relative', width: 260 }}>
                  <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                  <input type="text" placeholder="Search Member ID/Name..." className="input" style={{ paddingLeft: '2.75rem', height: 40, fontSize: '0.8125rem' }} value={bizSearch} onChange={e => setBizSearch(e.target.value)} />
               </div>
               <button onClick={loadBusiness} className="btn-primary" style={{ height: 40, padding: '0 1.25rem', fontSize: '0.75rem' }}>ANALYZE</button>
            </div>
         </div>

         {bizLoading ? <AdminSpinner /> : (
            <div className="scale-in">
               <AdminTable columns={BIZ_COLS} data={bizData} emptyText="No business data discovered." />
            </div>
         )}
      </div>

      {/* Data Integrity Protocol Info */}
      <div style={{ padding: '1.5rem', background: 'var(--orange-glow)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--orange)', display: 'flex', gap: '1rem', alignItems: 'flex-start', marginTop: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
           <FileSpreadsheet size={20} style={{ color: 'var(--orange)' }} />
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Intelligence Integrity</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Report parameters (Date Filters) apply to all CSV downloads. Team Business Intelligence is calculated recursively across the entire downline tree using the 40/30/30 distribution model.
          </p>
        </div>
      </div>
    </div>
  )
}
