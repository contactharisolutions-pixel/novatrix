import { useEffect, useState } from 'react'
import { Calendar, User, Layers, Trophy, Search, ArrowRight, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Panel, Spinner } from '../../components/member/ui'

export default function IncomeReportPage({ type, title, subtitle, icon: Icon }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/earnings/report?type=${type}`)
      .then(res => setData(res.data.records || []))
      .catch((err) => toast.error(err?.response?.data?.error || `Failed to load ${title}`))
      .finally(() => setLoading(false))
  }, [type, title])

  const q = search.toLowerCase()
  const filtered = !q ? data : data.filter(item =>
    (item.remarks || '').toLowerCase().includes(q) ||
    (item.from_user?.name || '').toLowerCase().includes(q) ||
    (item.from_user?.user_id || '').toLowerCase().includes(q)
  )

  const fmt = (n) => `$${(+n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title={title} subtitle={subtitle} />

      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input 
              type="text" 
              placeholder="Search by ID, name or remarks..." 
              className="input" 
              style={{ paddingLeft: '3rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Total {title}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--cyan)' }}>
                {fmt(data.reduce((acc, curr) => acc + +curr.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>SR.NO.</th>
                <th>DATE & TIME</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((item, i) => (
                <tr key={item.id || i}>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--text-faint)', fontSize: '0.75rem' }}>{i + 1}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={14} style={{ color: 'var(--text-faint)' }} />
                      </div>
                      <div style={{ fontSize: '0.8125rem' }}>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(item.created_at).toLocaleDateString()}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--green)' }}>+{fmt(item.amount)}</p>
                  </td>
                  <td>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.remarks || `${title} Credited`}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-faint)' }}>
                    No records found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
