import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Clock, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, DataTable, Badge, Spinner } from '../../components/member/ui'

const COLUMNS = [
  { key: 'created_at', label: 'Date', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
  { key: 'amount',     label: 'Amount',    render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${(+v).toLocaleString()}</span> },
  { key: 'tx_hash',    label: 'TxHash', render: (v) => v ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--cyan)' }}>
      {v.slice(0, 10)}...{v.slice(-8)}
      <ExternalLink size={12} style={{ opacity: 0.5 }} />
    </div>
  ) : '—' },
  { key: 'status',     label: 'Status',   render: (v) => <Badge status={v} /> },
  { key: 'note',       label: 'Note', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>{v || '—'}</span> },
]

export default function TopupHistoryPage() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/deposits/history')
      .then(({ data }) => setData(data.deposits || []))
      .catch(() => toast.error('Could not load deposit history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Deposit History"
        subtitle="View all your previous USDT deposits"
        action={
          <Link to="/dashboard/topup" className="btn-primary" style={{ padding: '0 1.25rem' }}>
            <Plus size={18} /> <span>Add Funds</span>
          </Link>
        }
      />
      
      {loading ? <Spinner /> : (
        <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Clock size={16} style={{ color: 'var(--text-faint)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Previous Deposits</p>
           </div>
           <DataTable columns={COLUMNS} data={data} emptyText="No deposits found." />
        </div>
      )}
    </div>
  )
}
