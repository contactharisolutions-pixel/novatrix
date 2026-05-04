import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, User, Mail, ShieldCheck, FileText, Image as ImageIcon, Search, Filter, Fingerprint, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminTable, StatusBadge, AdminModal, AdminSpinner, AdminStatCard } from '../../components/admin/ui'

const COLS = [
  { key: 'id',         label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'user',       label: 'Member', render: (v) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
       <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{v?.name}</span>
       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
         <span style={{ fontSize: '0.6875rem', color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>{v?.user_id}</span>
         <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>|</span>
         <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{v?.email}</span>
       </div>
    </div>
  ) },
  { key: 'doc_type',   label: 'Document', render: (v) => <span style={{ textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>{v?.replace(/_/g, ' ')}</span> },
  { key: 'status',     label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'review_note', label: 'Note', render: (v) => v ? <span style={{ color: 'var(--red)', fontSize: '0.75rem', fontWeight: 500 }}>{v}</span> : '—' },
  { key: 'created_at', label: 'Date', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

export default function KYCPage() {
  const [kycs,       setKycs]       = useState([])
  const [status,     setStatus]     = useState('pending')
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actLoading, setActLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const stats = {
    pending:  kycs.filter(k => k.status === 'pending').length,
    approved: kycs.filter(k => k.status === 'approved').length,
    rejected: kycs.filter(k => k.status === 'rejected').length,
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/kyc', { params: { status } })
      setKycs(data.kycs || [])
    } catch { toast.error('Could not retrieve identity verification queue') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [status])

  const approve = async () => {
    setActLoading(true)
    try {
      await adminApi.put(`/kyc/${modal.id}/approve`)
      toast.success('Identity verified and authorized.')
      setModal(null)
      load()
    } catch (err) { toast.error(err?.response?.data?.error || 'Verification failed') }
    finally { setActLoading(false) }
  }

  const reject = async () => {
    if (!rejectNote.trim()) return toast.error('System requires a reasoning for identity decline.')
    setActLoading(true)
    try {
      await adminApi.put(`/kyc/${modal.id}/reject`, { note: rejectNote })
      toast.success('Identity verification declined.')
      setModal(null); setRejectNote('')
      load()
    } catch (err) { toast.error(err?.response?.data?.error || 'Decline operation failed') }
    finally { setActLoading(false) }
  }

  const filteredKycs = kycs.filter(k => {
    const s = searchTerm.toLowerCase()
    return k.user?.name?.toLowerCase().includes(s) || 
           k.user?.user_id?.toLowerCase().includes(s) ||
           k.user?.email?.toLowerCase().includes(s)
  })

  const cols = [
    ...COLS,
    {
      key: 'id', label: 'Action',
      render: (_, row) => row.status === 'pending' ? (
        <button onClick={() => { setModal(row); setRejectNote('') }} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 900, background: 'var(--orange-glow)', border: '1px solid var(--orange)', color: 'var(--orange)' }}>
          REVIEW
        </button>
      ) : (
        <button onClick={() => setModal(row)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 900 }}>
          VIEW
        </button>
      ),
    },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Member Verification" subtitle="Review and verify member documents" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--gap-lg)' }}>
        <AdminStatCard label="New Requests" value={stats.pending} icon={Clock} color="orange" sub="Awaiting review" />
        <AdminStatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="green" sub="Verified members" />
        <AdminStatCard label="Rejected" value={stats.rejected} icon={AlertCircle} color="red" sub="Flagged requests" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', background: 'var(--panel-bg)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['pending', 'approved', 'rejected'].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: status === s ? 'var(--orange-glow)' : 'rgba(255,255,255,0.02)',
                color: status === s ? 'var(--orange)' : 'var(--text-faint)',
                border: `1px solid ${status === s ? 'var(--orange)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'var(--transition-normal)'
              }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
           <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
           <input 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Search by ID, Name or Email..." 
             className="input" 
             style={{ paddingLeft: '2.75rem', height: 44, fontSize: '0.875rem' }}
           />
        </div>
      </div>

      {loading ? <AdminSpinner /> : <AdminTable columns={cols} data={filteredKycs} emptyText="No identity verification requests matching your criteria." />}

      {modal && (
        <AdminModal title={modal.status === 'pending' ? `Review KYC — #${modal.id}` : `KYC Record — #${modal.id}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
               <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{modal.user?.name}</p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 800 }}>{modal.user?.user_id}</span>
                  <span style={{ color: 'var(--text-faint)' }}>·</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{modal.user?.email}</span>
               </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'var(--orange-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--orange)' }}>
               <p style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {modal.doc_type?.replace(/_/g, ' ')}
               </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} id="kyc-images">
              {[
                { label: 'Front Photo', url: modal.front_url },
                { label: 'Back Photo',  url: modal.back_url  },
              ].filter((d) => d.url).map(({ label, url }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{label}</p>
                    <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.625rem', color: 'var(--cyan)', fontWeight: 800, textDecoration: 'none' }}>VIEW ↗</a>
                  </div>
                  <div style={{ position: 'relative', height: 140, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <img
                      src={url}
                      alt={label}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.25rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {modal.status === 'pending' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Rejection <span style={{ color: 'var(--red)' }}>*</span></label>
                  <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                    rows={2} placeholder="Explain why..." className="input resize-none" style={{ fontSize: '0.8125rem' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={approve} disabled={actLoading}
                    className="btn-primary" style={{ flex: 1, height: 44, background: 'var(--green)', borderColor: 'var(--green)' }}>
                    {actLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Approve</span>}
                  </button>
                  <button onClick={reject} disabled={actLoading}
                    className="btn-secondary" style={{ flex: 1, height: 44, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    {actLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Reject</span>}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <p style={{ fontSize: '0.6875rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Note</p>
                 <p style={{ fontSize: '0.8125rem', color: modal.status === 'approved' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                   {modal.status === 'approved' ? 'Identity verified.' : (modal.review_note || 'Rejected.')}
                 </p>
                 <button onClick={() => setModal(null)} className="btn-secondary" style={{ width: '100%', marginTop: '1rem', height: 40 }}>Close</button>
              </div>
            )}
          </div>
        </AdminModal>
      )}
      <style>{`
        @media (max-width: 639px) {
          #kyc-images { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
