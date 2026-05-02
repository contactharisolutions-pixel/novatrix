import { useEffect, useState } from 'react'
import { Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, DataTable, Spinner } from '../../components/member/ui'

const COLUMNS = [
  { label: 'SR.NO.',      render: (v, row, i) => <span style={{ fontWeight: 800, color: 'var(--text-faint)' }}>{i + 1}</span> },
  { key: 'created_at',   label: 'DATE & TIME', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
  { key: 'amount',       label: 'AMOUNT',     render: (v, row) => (
    <span style={{ fontWeight: 800, color: row.type === 'credit' ? 'var(--green)' : 'var(--red)' }}>
      {row.type === 'credit' ? '+' : '-'}${(+v).toLocaleString()}
    </span>
  )},
  { key: 'remarks',      label: 'REMARKS',    render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{v}</span> },
]

export default function FundHistory() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/funds/history')
      .then(({ data }) => setData(data.records || []))
      .catch(() => toast.error('Could not load fund history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Fund Wallet History" subtitle="Tracking all credits and debits to your fund wallet" />
      
      {loading ? <Spinner /> : (
        <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Clock size={16} style={{ color: 'var(--text-faint)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transaction Logs</p>
           </div>
           <DataTable columns={COLUMNS} data={data} emptyText="No transaction logs found." />
        </div>
      )}
    </div>
  )
}
