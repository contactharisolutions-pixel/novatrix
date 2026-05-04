import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Calendar, Activity, User, Network, Trophy, Award, Loader2, Download, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, Panel, AdminTable, AdminSpinner, Pagination, StatusBadge } from '../../components/admin/ui'

const INCOME_TYPES = [
  { id: 'roi',      label: 'Daily ROI',    icon: Activity, color: 'var(--cyan)' },
  { id: 'direct',   label: 'Direct Bonus', icon: User,     color: 'var(--green)' },
  { id: 'level',    label: 'Level Income', icon: Network,  color: 'var(--purple)' },
  { id: 'reward',   label: 'Rewards',      icon: Trophy,   color: 'var(--orange)' },
  { id: 'royalty',  label: 'Royalty',      icon: Award,    color: 'var(--cyan)' },
]

export default function IncomeReportsPage() {
  const [activeType, setActiveType] = useState('roi')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/reports/incomes', {
        params: { type: activeType, search, from, to, page: pg }
      })
      setReports(data.reports || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setPage(pg)
    } catch { toast.error('Failed to retrieve income datasets.') }
    finally { setLoading(false) }
  }, [activeType, search, from, to, page])

  useEffect(() => { load(1) }, [activeType, from, to])

  const cols = [
    { key: 'id', label: 'Sr.No', render: (_, __, i) => <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{(page-1)*20 + i + 1}</span> },
    { key: 'user', label: 'Beneficiary', render: (v) => (
       <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{v?.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>{v?.user_id}</span>
       </div>
    )},
    { key: 'amount', label: 'Amount', render: (v) => <span style={{ fontWeight: 800, color: 'var(--green)' }}>${(+v).toLocaleString()}</span> },
    { key: 'from_user', label: 'Origin', render: (v) => v ? `${v.name} (#${v.user_id})` : <span style={{ color: 'var(--text-faint)' }}>System Distribution</span> },
    { key: 'level', label: 'Lvl', render: (v) => v ? <span style={{ fontWeight: 700, color: 'var(--purple)' }}>L{v}</span> : '-' },
    { key: 'created_at', label: 'Timestamp', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleString()}</span> },
    { key: 'remarks', label: 'Remarks', render: (v) => <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Income Auditing" subtitle={`Total of ${total} income records identified for ${activeType.toUpperCase()}`} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
         {INCOME_TYPES.map(t => (
            <button
               key={t.id}
               onClick={() => setActiveType(t.id)}
               style={{
                  padding: '0.75rem 1.25rem', borderRadius: 12, border: '1px solid var(--border)',
                  background: activeType === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: activeType === t.id ? 'var(--text-primary)' : 'var(--text-faint)',
                  display: 'flex', alignItems: 'center', gap: '0.625rem', whiteSpace: 'nowrap',
                  transition: '0.2s', fontWeight: activeType === t.id ? 800 : 600,
                  borderColor: activeType === t.id ? t.color : 'var(--border)'
               }}
            >
               <t.icon size={16} style={{ color: activeType === t.id ? t.color : 'inherit' }} />
               {t.label}
            </button>
         ))}
      </div>

      {/* Filters */}
      <Panel>
         <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
               <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Search Member</label>
               <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Member ID or Name..." className="input" style={{ paddingLeft: '2.75rem' }} />
               </div>
            </div>
            <div style={{ width: 180 }}>
               <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>From Date</label>
               <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
            </div>
            <div style={{ width: 180 }}>
               <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>To Date</label>
               <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
            </div>
            <button onClick={() => load(1)} className="btn-primary" style={{ height: 44, padding: '0 1.5rem' }}>APPLY FILTERS</button>
         </div>
      </Panel>

      {loading ? <AdminSpinner /> : (
         <div className="scale-in">
            <AdminTable columns={cols} data={reports} emptyText={`No ${activeType} records discovered for this period.`} />
            <Pagination page={page} pages={pages} onPage={load} />
         </div>
      )}
    </div>
  )
}
