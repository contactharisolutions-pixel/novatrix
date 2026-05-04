import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Clock, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, DataTable, Badge, Spinner } from '../../components/member/ui'

const COLUMNS = [
  { key: 'id',                label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'amount',            label: 'Invested',   render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${(+v).toLocaleString()}</span> },
  { key: 'daily_roi_percent', label: 'Profit (%)',  render: (v) => <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{v}%</span> },
  { key: 'total_earned',      label: 'Earned ($)',   render: (v) => <span style={{ color: 'var(--green)', fontWeight: 700 }}>${(+v).toLocaleString()}</span> },
  { key: 'max_return',        label: 'Total Limit',   render: (v) => <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>${(+v).toLocaleString()}</span> },
  { key: 'status',            label: 'Status',     render: (v) => <Badge status={v} /> },
  { key: 'started_at',        label: 'Date',  render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

export default function TradeHistoryPage() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/trades/history')
      .then(({ data }) => setData(data.packages || []))
      .catch(() => toast.error('Could not load trade history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Trade History"
        subtitle="View all your active and completed investments"
        action={
          <Link to="/dashboard/trade" className="btn-primary" style={{ padding: '0 1.25rem' }}>
            <TrendingUp size={18} /> <span>Start Trade</span>
          </Link>
        }
      />

      {loading ? <Spinner /> : (
        <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Activity size={16} style={{ color: 'var(--text-faint)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>My Trades</p>
           </div>
           <DataTable columns={COLUMNS} data={data} emptyText="No trades found." />
        </div>
      )}
    </div>
  )
}
