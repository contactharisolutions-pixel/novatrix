import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Clock, ExternalLink, ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, DataTable, Badge, Spinner } from '../../components/member/ui'

const COLUMNS = [
  { key: 'created_at',    label: 'Registered', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
  { key: 'amount',        label: 'Gross', render: (v) => <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>${(+v).toLocaleString()}</span> },
  { key: 'fee',           label: 'Network Fee',    render: (v) => <span style={{ color: 'var(--red)', fontSize: '0.8125rem' }}>-${(+v).toLocaleString()}</span> },
  { key: 'net_amount',    label: 'Liquidation',    render: (v) => <span style={{ fontWeight: 800, color: 'var(--green)' }}>${(+v).toLocaleString()}</span> },
  {
    key: 'wallet_address', label: 'Destination',
    render: (v) => v ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v.slice(0, 10)}…{v.slice(-8)}</span> : '—',
  },
  {
    key: 'tx_hash', label: 'Reference',
    render: (v) => v ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--cyan)' }}>
        {v.slice(0, 10)}...
        <ExternalLink size={12} style={{ opacity: 0.5 }} />
      </div>
    ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>Pending Pipeline</span>,
  },
  { key: 'status', label: 'State', render: (v) => <Badge status={v} /> },
]

export default function WithdrawHistoryPage() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/withdrawals/history')
      .then(({ data }) => setData(data.withdrawals || []))
      .catch(() => toast.error('Could not load withdrawal history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Liquidation Log"
        subtitle="Historical registry of all asset exits and network settlements"
        action={
          <Link to="/dashboard/withdraw" className="btn-primary" style={{ padding: '0 1.25rem' }}>
            <ArrowUpRight size={18} /> <span>Initiate Exit</span>
          </Link>
        }
      />
      
      {loading ? <Spinner /> : (
        <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Clock size={16} style={{ color: 'var(--text-faint)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Historical Settlements</p>
           </div>
           <DataTable columns={COLUMNS} data={data} emptyText="No liquidation operations discovered in the registry." />
        </div>
      )}
    </div>
  )
}
