import { useEffect, useState, useCallback } from 'react'
import { Search, UserCheck, UserX, Plus, Eye, Loader2, User, Mail, DollarSign, Activity, Calendar, ShieldAlert, LogIn, Phone, Globe, Lock, ShieldCheck, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import useAuthStore from '../../store/useAuthStore'
import { AdminPageHeader, AdminTable, StatusBadge, AdminModal, AdminSpinner, Pagination, Panel } from '../../components/admin/ui'

const COLS = [
  { key: 'user_id',    label: 'User ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 800 }}>{v}</span> },
  { key: 'name',       label: 'User', render: (v, row) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
       <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{v}</span>
       <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{row.email}</span>
    </div>
  ) },
  { key: 'status',     label: 'Status',  render: (v) => <StatusBadge status={v} /> },
  { key: 'fund_wallet_balance',   label: 'Deposit Wallet',   render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${(+v).toLocaleString()}</span> },
  { key: 'income_wallet_balance', label: 'Profit Wallet', render: (v) => <span style={{ fontWeight: 800, color: 'var(--green)' }}>${(+v).toLocaleString()}</span> },
  { key: 'created_at', label: 'Joined',  render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

export default function MembersPage() {
  const impersonate = useAuthStore(s => s.impersonate)
  const [members,  setMembers]  = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [actLoading, setActLoading] = useState(false)
  const [memberDetails, setMemberDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [shownPassword, setShownPassword] = useState(null)
  const [pwLoading, setPwLoading] = useState(false)

  const load = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/members', { params: { page: pg, search, status } })
      setMembers(data.members || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setPage(pg)
    } catch { toast.error('Could not retrieve member registry') }
    finally { setLoading(false) }
  }, [page, search, status])

  useEffect(() => { load(1) }, [search, status])

  const loadDetails = async (id) => {
    setDetailsLoading(true)
    setModal({ type: 'details' })
    setShownPassword(null)
    setNewPassword('')
    try {
      const { data } = await adminApi.get(`/members/${id}`)
      setMemberDetails(data.member)
    } catch { toast.error('Failed to analyze member profile.') }
    finally { setDetailsLoading(false) }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      const { data } = await adminApi.post(`/members/${memberDetails.id}/reset-password`, { new_password: newPassword })
      setShownPassword(data.new_password)
      setNewPassword('')
      toast.success('Password reset successfully')
    } catch (err) { toast.error(err?.response?.data?.error || 'Reset failed') }
    finally { setPwLoading(false) }
  }

  const handleImpersonate = async (id) => {
    if (!window.confirm('Initialize administrative impersonation? You will be logged into the platform as this member.')) return
    try {
      const { data } = await adminApi.get(`/members/${id}/impersonate`)
      impersonate(data)
    } catch { toast.error('Impersonation protocol failed.') }
  }

  const updateStatus = async (id, newStatus) => {
    setActLoading(true)
    try {
      await adminApi.put(`/members/${id}/status`, { status: newStatus })
      toast.success(`Entity state transitioned to ${newStatus}.`)
      setModal(null)
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'State transition failed') }
    finally { setActLoading(false) }
  }

  const addBalance = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    setActLoading(true)
    try {
      await adminApi.post(`/members/${modal.member.id}/add-balance`, {
        wallet:  fd.get('wallet'),
        amount:  parseFloat(fd.get('amount')),
        remarks: fd.get('remarks'),
      })
      toast.success('Reserve allocation adjusted successfully.')
      setModal(null)
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Reserve adjustment failed') }
    finally { setActLoading(false) }
  }

  const activatePackage = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    setActLoading(true)
    try {
      await adminApi.post(`/members/${modal.member.id}/activate-package`, {
        amount: parseFloat(fd.get('amount'))
      })
      toast.success('Member forcefully activated with trading package.')
      setModal(null)
      load(page)
    } catch (err) { toast.error(err?.response?.data?.error || 'Activation failed') }
    finally { setActLoading(false) }
  }

  const cols = [
    ...COLS,
    {
      key: 'id', label: 'Intelligence & Control',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => loadDetails(row.id)} className="btn-secondary" style={{ padding: '0.4rem', minWidth: 0 }} title="Deep Analysis">
             <Eye size={14} />
          </button>
          <button onClick={() => handleImpersonate(row.id)} className="btn-secondary" style={{ padding: '0.4rem', minWidth: 0, color: 'var(--orange)' }} title="Impersonate">
             <LogIn size={14} />
          </button>
          <button onClick={() => setModal({ type: 'status', member: row })} className="btn-secondary" style={{ padding: '0.4rem', minWidth: 0 }} title="Update Status">
             <ShieldAlert size={14} />
          </button>
          <button onClick={() => setModal({ type: 'balance', member: row })} className="btn-primary" style={{ padding: '0.4rem', minWidth: 0 }} title="Credit Wallet">
             <DollarSign size={14} />
          </button>
          <button onClick={() => setModal({ type: 'activate', member: row })} className="btn-primary" style={{ padding: '0.4rem', minWidth: 0, background: 'var(--green-glow)', borderColor: 'var(--green)', color: 'var(--green)' }} title="Force Activate Trade Package">
             <Activity size={14} />
          </button>
        </div>
      ),
    },
  ]

  const fmt = (n) => `$${(+n || 0).toLocaleString()}`

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Member Registry" subtitle={`Analyzing and controlling ${total} platform entities`} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by ID, Identity, or Email..."
            className="input"
            style={{ paddingLeft: '3.5rem' }}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" style={{ width: 180 }}>
          <option value="">All Operating States</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="blocked">Blocked Only</option>
        </select>
      </div>

      {loading ? <AdminSpinner /> : <AdminTable columns={cols} data={members} emptyText="No matching entities discovered in the registry." />}
      <Pagination page={page} pages={pages} onPage={(p) => load(p)} />

      {/* Details Modal */}
      {modal?.type === 'details' && (
        <AdminModal title={`Deep Profile Analysis â€” ${memberDetails?.name || 'Loading...'}`} onClose={() => { setModal(null); setMemberDetails(null); }}>
           {detailsLoading ? <AdminSpinner /> : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                   <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Contact Intel</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}><Mail size={12} /> {memberDetails.email}</div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}><Phone size={12} /> {memberDetails.phone}</div>
                      </div>
                   </div>
                   <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Network Lineage</p>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Sponsor: {memberDetails.sponsor ? `${memberDetails.sponsor.name} (#${memberDetails.sponsor.user_id})` : 'System'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--cyan)' }}>Direct Referrals: {memberDetails.referrals?.length || 0}</p>
                   </div>
                   <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>Financial State</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}><span>Fund:</span> <b style={{ color: 'var(--text-primary)' }}>{fmt(memberDetails.fund_wallet_balance)}</b></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}><span>Profit:</span> <b style={{ color: 'var(--green)' }}>{fmt(memberDetails.income_wallet_balance)}</b></div>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                   <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={14} /> ACTIVE PACKAGES</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         {memberDetails.packages?.slice(0,3).map(p => (
                            <div key={p.id} style={{ fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                               <span>{fmt(p.amount)} Trade</span>
                               <span style={{ color: 'var(--cyan)' }}>{new Date(p.started_at).toLocaleDateString()}</span>
                            </div>
                         ))}
                         {!memberDetails.packages?.length && <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>No active trades.</p>}
                      </div>
                   </div>
                   <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={14} /> RECENT INCOME</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         {memberDetails.bonuses?.slice(0,3).map(b => (
                            <div key={b.id} style={{ fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                               <span style={{ textTransform: 'uppercase' }}>{b.type}</span>
                               <span style={{ color: 'var(--green)' }}>+{fmt(b.amount)}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                   <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Lock size={11} /> Security Override — Reset Password</p>
                   <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password…"
                        className="input"
                        style={{ flex: 1, height: 38, fontSize: '0.8125rem' }}
                      />
                      <button onClick={handleResetPassword} disabled={pwLoading} className="btn-primary" style={{ height: 38, padding: '0 1rem', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 900 }}>
                        {pwLoading ? <Loader2 size={14} className="animate-spin" /> : 'RESET'}
                      </button>
                   </div>
                   {shownPassword && (
                      <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>New Password:</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.9rem', color: 'var(--green)', letterSpacing: '0.05em' }}>{shownPassword}</span>
                      </div>
                   )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                   <button onClick={() => handleImpersonate(memberDetails.id)} className="btn-secondary" style={{ flex: 1, height: 44, color: 'var(--orange)', borderColor: 'var(--border-orange)' }}><LogIn size={16} /> LOGIN AS MEMBER</button>
                   <button onClick={() => { setModal({ type: 'status', member: memberDetails }) }} className="btn-secondary" style={{ flex: 1, height: 44 }}><ShieldAlert size={16} /> CHANGE STATUS</button>
                </div>
             </div>
           )}
        </AdminModal>
      )}

      {/* Status modal */}
      {modal?.type === 'status' && (
        <AdminModal title={`Transition State â€” ${modal.member.name}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 800 }}>CURRENT STATE</p>
               <StatusBadge status={modal.member.status} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {['active', 'inactive', 'blocked'].filter((s) => s !== modal.member.status).map((s) => (
                <button key={s} onClick={() => updateStatus(modal.member.id, s)} disabled={actLoading}
                  className="btn-secondary" style={{ 
                    height: 44, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase',
                    borderColor: s === 'blocked' ? 'rgba(239,68,68,0.2)' : s === 'active' ? 'rgba(16,185,129,0.2)' : 'var(--border)',
                    color: s === 'blocked' ? 'var(--red)' : s === 'active' ? 'var(--green)' : 'var(--text-secondary)'
                  }}>
                  {actLoading ? <Loader2 size={16} className="animate-spin" /> : s}
                </button>
              ))}
            </div>
          </div>
        </AdminModal>
      )}

      {/* Add balance modal */}
      {modal?.type === 'balance' && (
        <AdminModal title={`Manual Asset Allocation â€” ${modal.member.name}`} onClose={() => setModal(null)}>
          <form onSubmit={addBalance} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>CHOOSE TARGET RESERVE</label>
              <select name="wallet" className="input">
                <option value="fund">Deposit Wallet (Internal Reserves)</option>
                <option value="income">Profit Wallet (Liquid Yield)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>ALLOCATION AMOUNT ($)</label>
              <input name="amount" type="number" step="0.01" min="1" placeholder="0.00" className="input" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>AUDIT LOG NOTE</label>
              <textarea name="remarks" rows={3} placeholder="Provide mandatory justification for this manual adjustmentâ€¦" className="input resize-none" required />
            </div>
            <button type="submit" disabled={actLoading} className="btn-primary" style={{ height: 48 }}>
              {actLoading ? <Loader2 size={18} className="animate-spin" /> : 'EXECUTE PROTOCOL'}
            </button>
          </form>
        </AdminModal>
      )}

      {/* Force Activate Modal */}
      {modal?.type === 'activate' && (
        <AdminModal title={`Force Activate Trade Package â€” ${modal.member.name}`} onClose={() => setModal(null)}>
          <form onSubmit={activatePackage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                This action will directly activate a new Trade Package for the user without requiring or allocating any Deposit Wallet funds. The user's status will also be set to Active.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>PACKAGE AMOUNT ($)</label>
              <input name="amount" type="number" step="10" min="20" max="5000" placeholder="Min 20, Max 5000" className="input" required />
            </div>
            <button type="submit" disabled={actLoading} className="btn-primary" style={{ height: 48, background: 'var(--green)', color: '#000', borderColor: 'var(--green)' }}>
              {actLoading ? <Loader2 size={18} className="animate-spin" /> : 'EXECUTE ACTIVATION'}
            </button>
          </form>
        </AdminModal>
      )}
    </div>
  )
}

