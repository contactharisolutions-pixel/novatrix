import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, Eye, User, DollarSign, Hash, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminTable, StatusBadge, AdminModal, AdminSpinner, Pagination } from '../../components/admin/ui'

const COLS = [
  { key: 'id',         label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'user',       label: 'User', render: (v) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
       <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{v?.name}</span>
       <span style={{ fontSize: '0.6875rem', color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>{v?.user_id}</span>
    </div>
  ) },
  { key: 'amount',     label: 'Amount', render: (v) => <span style={{ fontWeight: 900, color: 'var(--green)', fontSize: '1rem' }}>${(+v).toLocaleString()}</span> },
  { key: 'tx_hash',    label: 'TxHash', render: (v) => v ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v.slice(0,12)}…</span> : '—' },
  { key: 'status',     label: 'Status',    render: (v) => <StatusBadge status={v} /> },
  { key: 'created_at', label: 'Date', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

export default function DepositsPage() {
  const [deposits, setDeposits] = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [status,   setStatus]   = useState('pending')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actLoading, setActLoading] = useState(false)

  const load = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/deposits', { params: { page: pg, status } })
      setDeposits(data.deposits || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setPage(pg)
    } catch { toast.error('Could not load deposits') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load(1) }, [status])

  const approve = async (id) => {
    setActLoading(true)
    try {
      await adminApi.put(`/deposits/${id}/approve`)
      toast.success('Capital injection authorized successfully.')
      setModal(null)
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Authorization failed') }
    finally { setActLoading(false) }
  }

  const reject = async (id) => {
    setActLoading(true)
    try {
      await adminApi.put(`/deposits/${id}/reject`, { note: rejectNote || 'Rejected by administrative oversight' })
      toast.success('Transaction declined.')
      setModal(null)
      setRejectNote('')
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Decline operation failed') }
    finally { setActLoading(false) }
  }

  const cols = [
    ...COLS,
    {
      key: 'id', label: 'Action',
      render: (id, row) => row.status === 'pending' ? (
        <button onClick={() => setModal(row)} className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.6875rem', fontWeight: 900 }}>
          INSPECT
        </button>
      ) : null,
    },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Deposits" subtitle={`Manage ${total} user deposits`} />

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

      {loading ? <AdminSpinner /> : <AdminTable columns={cols} data={deposits} emptyText="No deposits found for this filter." />}
      <Pagination page={page} pages={pages} onPage={load} />

      {/* Review modal */}
      {modal && (
        <AdminModal title={`Check Deposit — #${modal.id}`} onClose={() => { setModal(null); setRejectNote('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} id="dep-grid">
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
                     <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Volume</span>
                  </div>
                  <p style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--green)' }}>${(+modal.amount).toLocaleString()}</p>
               </div>
            </div>

            {modal.tx_hash && (
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                     <Hash size={14} style={{ color: 'var(--text-faint)' }} />
                     <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Network Reference</span>
                  </div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{modal.tx_hash}</p>
               </div>
            )}

            {modal.screenshot_url && (
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                     <ImageIcon size={14} style={{ color: 'var(--text-faint)' }} />
                     <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Validation Proof</span>
                  </div>
                  <img
                    src={modal.screenshot_url}
                    alt="Proof"
                    style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', maxHeight: 300, objectFit: 'contain' }}
                    onError={(e) => { e.target.parentElement.style.display = 'none' }}
                  />
               </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Note (Optional)</label>
              <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason for rejecting (optional)..." className="input" />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => approve(modal.id)} disabled={actLoading}
                className="btn-primary" style={{ flex: 1, height: 44, background: 'var(--green)', borderColor: 'var(--green)' }}>
                {actLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={16} /> <span>Approve</span></>}
              </button>
              <button onClick={() => reject(modal.id)} disabled={actLoading}
                className="btn-secondary" style={{ flex: 1, height: 44, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
                {actLoading ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={16} /> <span>Reject</span></>}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
      <style>{`
        @media (max-width: 500px) { #dep-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
