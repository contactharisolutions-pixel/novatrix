import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, User, DollarSign, Wallet, Hash, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminTable, StatusBadge, AdminModal, AdminSpinner, Pagination } from '../../components/admin/ui'

const COLS = [
  { key: 'id',           label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'user',         label: 'User', render: (v) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
       <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{v?.name}</span>
       <span style={{ fontSize: '0.6875rem', color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>{v?.user_id}</span>
    </div>
  ) },
  { key: 'amount',       label: 'Total', render: (v) => <span style={{ fontWeight: 700, color: 'var(--text-faint)' }}>${(+v).toLocaleString()}</span> },
  { key: 'fee',          label: 'Fee',    render: (v) => <span style={{ color: 'var(--red)', fontSize: '0.8125rem' }}>-${(+v).toLocaleString()}</span> },
  { key: 'net_amount',   label: 'Receive', render: (v) => <span style={{ fontWeight: 900, color: 'var(--green)', fontSize: '1rem' }}>${(+v).toLocaleString()}</span> },
  { key: 'wallet_address', label: 'Wallet', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v?.slice(0,10)}…{v?.slice(-8)}</span> },
  { key: 'status',       label: 'Status',    render: (v) => <StatusBadge status={v} /> },
  { key: 'created_at',   label: 'Date',   render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([])
  const [total,       setTotal]       = useState(0)
  const [pages,       setPages]       = useState(1)
  const [page,        setPage]        = useState(1)
  const [status,      setStatus]      = useState('pending')
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [txHash,      setTxHash]      = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actLoading,  setActLoading]  = useState(false)

  const load = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/withdrawals', { params: { page: pg, status } })
      setWithdrawals(data.withdrawals || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setPage(pg)
    } catch { toast.error('Could not load withdrawals') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load(1) }, [status])

  const approve = async () => {
    if (!txHash.trim()) return toast.error('System requires a valid blockchain Transaction Hash for authorization.')
    setActLoading(true)
    try {
      await adminApi.put(`/withdrawals/${modal.id}/approve`, { tx_hash: txHash })
      toast.success('Liquidation authorized and processed.')
      setModal(null); setTxHash('')
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Authorization operation failed') }
    finally { setActLoading(false) }
  }

  const reject = async () => {
    setActLoading(true)
    try {
      await adminApi.put(`/withdrawals/${modal.id}/reject`, { reason: rejectReason || 'Declined by administrative oversight' })
      toast.success('Liquidation declined. Capital refunded to subject wallet.')
      setModal(null); setRejectReason('')
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Decline operation failed') }
    finally { setActLoading(false) }
  }

  const cols = [
    ...COLS,
    {
      key: 'id', label: 'Action',
      render: (id, row) => row.status === 'pending' ? (
        <button onClick={() => { setModal(row); setTxHash(''); setRejectReason('') }} className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.6875rem', fontWeight: 900 }}>
          PROCESS
        </button>
      ) : null,
    },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Withdrawals" subtitle={`Manage ${total} user withdrawals`} />

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {['pending','approved','rejected'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 100, fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: status === s ? 'var(--orange-glow)' : 'rgba(255,255,255,0.03)',
              color: status === s ? 'var(--orange)' : 'var(--text-faint)',
              border: `1px solid ${status === s ? 'var(--orange)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'var(--transition-normal)'
            }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <AdminSpinner /> : <AdminTable columns={cols} data={withdrawals} emptyText="No withdrawals found." />}
      <Pagination page={page} pages={pages} onPage={load} />

      {modal && (
        <AdminModal title={`Process Withdrawal — #${modal.id}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} id="with-grid">
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                     <User size={14} style={{ color: 'var(--cyan)' }} />
                     <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Subject Entity</span>
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{modal.user?.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 800 }}>{modal.user?.user_id}</p>
               </div>
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                     <DollarSign size={14} style={{ color: 'var(--green)' }} />
                     <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Settlement</span>
                  </div>
                  <p style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--green)' }}>${(+modal.net_amount).toLocaleString()}</p>
               </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Wallet size={14} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Destination Address (BEP20)</span>
               </div>
               <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{modal.wallet_address}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>System Transaction Hash <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={txHash} onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x… transmit blockchain reference" className="input" style={{ fontFamily: 'JetBrains Mono, monospace' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Administrative Override Note</label>
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reasoning for declining settlement…" className="input" />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={approve} disabled={actLoading}
                className="btn-primary" style={{ flex: 1, height: 44, background: 'var(--green)', borderColor: 'var(--green)' }}>
                {actLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={16} /> <span>Authorize</span></>}
              </button>
              <button onClick={reject} disabled={actLoading}
                className="btn-secondary" style={{ flex: 1, height: 44, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
                {actLoading ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={16} /> <span>Decline</span></>}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
      <style>{`
        @media (max-width: 500px) { #with-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
