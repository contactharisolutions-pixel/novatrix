import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Loader2, MessageSquare, User, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminTable, StatusBadge, AdminModal, AdminSpinner } from '../../components/admin/ui'

const COLS = [
  { key: 'id',         label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'user',       label: 'User',  render: (v) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
       <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{v?.name}</span>
       <span style={{ fontSize: '0.6875rem', color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>{v?.user_id}</span>
    </div>
  ) },
  { key: 'subject',    label: 'Subject', render: (v) => <span style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
  { key: 'category',   label: 'Category', render: (v) => <span style={{ textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'status',     label: 'Status',  render: (v) => <StatusBadge status={v} /> },
  { key: '_count',     label: 'Replies', render: (v) => <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>{v?.replies ?? 0}</span> },
  { key: 'updated_at', label: 'Last Active', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> },
]

function TicketThread({ ticket, onClose, onRefresh }) {
  const [reply,      setReply]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [changingSt, setChangingSt] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.replies])

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await adminApi.post(`/tickets/${ticket.id}/reply`, { message: reply })
      setReply('')
      toast.success('Response transmitted.')
      onRefresh()
    } catch (err) { toast.error(err?.response?.data?.error || 'Transmission failed') }
    finally { setSending(false) }
  }

  const changeStatus = async (status) => {
    setChangingSt(true)
    try {
      await adminApi.put(`/tickets/${ticket.id}/status`, { status })
      toast.success(`Channel transitioned to ${status}.`)
      onRefresh()
    } catch (err) { toast.error(err?.response?.data?.error || 'Transition failed') }
    finally { setChangingSt(false) }
  }

  return (
    <AdminModal title={`Ticket Chat — #${ticket.id}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
           <StatusBadge status={ticket.status} />
           <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{ticket.category}</span>
           <span style={{ color: 'var(--border)' }}>·</span>
           <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--cyan)' }}>{ticket.user?.user_id} — {ticket.user?.name}</span>
        </div>

        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="custom-scrollbar">
              {/* Original message */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                 <div style={{ background: 'var(--purple-glow)', border: '1px solid var(--border-purple)', padding: '1rem', borderRadius: 'var(--radius-md) var(--radius-sm) 0 var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                       <User size={12} style={{ color: 'var(--purple)' }} />
                       <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--purple)', textTransform: 'uppercase' }}>{ticket.user?.name}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{ticket.message}</p>
                 </div>
              </div>

              {/* Replies */}
              {ticket.replies?.map((r) => (
                <div key={r.id} style={{ alignSelf: r.is_admin ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                   <div style={{ 
                      background: r.is_admin ? 'var(--orange-glow)' : 'var(--purple-glow)', 
                      border: `1px solid ${r.is_admin ? 'var(--orange)' : 'var(--border-purple)'}`, 
                      padding: '1rem', 
                      borderRadius: r.is_admin ? 'var(--radius-sm) var(--radius-md) var(--radius-md) 0' : 'var(--radius-md) var(--radius-sm) 0 var(--radius-md)' 
                   }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                         {r.is_admin ? <ShieldCheck size={12} style={{ color: 'var(--orange)' }} /> : <User size={12} style={{ color: 'var(--purple)' }} />}
                         <span style={{ fontSize: '0.625rem', fontWeight: 900, color: r.is_admin ? 'var(--orange)' : 'var(--purple)', textTransform: 'uppercase' }}>
                            {r.is_admin ? 'Ecosystem Support' : r.user?.name}
                         </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{r.message}</p>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', marginTop: '0.5rem', textAlign: 'right' }}>{new Date(r.created_at).toLocaleString()}</p>
                   </div>
                </div>
              ))}
              <div ref={bottomRef} />
           </div>

           {ticket.status !== 'closed' && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
                 <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2}
                   placeholder="Type your reply here..." className="input resize-none flex-1" />
                 <button onClick={sendReply} disabled={sending} className="btn-primary" style={{ width: 60, padding: 0 }}>
                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                 </button>
              </div>
           )}
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {['open', 'in_progress', 'closed'].filter((s) => s !== ticket.status).map((s) => (
            <button key={s} onClick={() => changeStatus(s)} disabled={changingSt}
              className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.6875rem', fontWeight: 900, textTransform: 'uppercase' }}>
              SET STATUS TO {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </AdminModal>
  )
}

export default function TicketsPage() {
  const [tickets,   setTickets]   = useState([])
  const [status,    setStatus]    = useState('open')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [detail,    setDetail]    = useState(null)
  const [detLoading, setDetLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/tickets', { params: { status } })
      setTickets(data.tickets || [])
    } catch { toast.error('Could not retrieve support queue') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [status])

  const openDetail = async (row) => {
    setSelected(row)
    setDetLoading(true)
    try {
      const { data } = await adminApi.get(`/tickets/${row.id}`)
      setDetail(data.ticket)
    } catch { toast.error('Could not load stream details') }
    finally { setDetLoading(false) }
  }

  const refreshDetail = async () => {
    if (!selected) return
    const { data } = await adminApi.get(`/tickets/${selected.id}`)
    setDetail(data.ticket)
    load()
  }

  const cols = [
    ...COLS,
    {
      key: 'id', label: 'Command',
      render: (_, row) => (
        <button onClick={() => openDetail(row)} className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.6875rem', fontWeight: 900 }}>
          REPLY
        </button>
      ),
    },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader title="Support Tickets" subtitle={`Manage ${tickets.length} support requests`} />

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {['open', 'in_progress', 'closed'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 100, fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: status === s ? 'var(--orange-glow)' : 'rgba(255,255,255,0.03)',
              color: status === s ? 'var(--orange)' : 'var(--text-faint)',
              border: `1px solid ${status === s ? 'var(--orange)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'var(--transition-normal)'
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <AdminSpinner /> : <AdminTable columns={cols} data={tickets} emptyText="No tickets found." />}

      {detail && !detLoading && (
        <TicketThread ticket={detail} onClose={() => { setDetail(null); setSelected(null) }} onRefresh={refreshDetail} />
      )}
      {detLoading && (
        <AdminModal title="Loading ticket..." onClose={() => { setSelected(null); setDetLoading(false) }}>
          <AdminSpinner />
        </AdminModal>
      )}
    </div>
  )
}
