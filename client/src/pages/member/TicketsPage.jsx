import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowLeft, Send, XCircle, MessageSquare, Loader2, LifeBuoy, Clock, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Badge, DataTable, Spinner, Panel } from '../../components/member/ui'
import useAuthStore from '../../store/useAuthStore'

const createSchema = z.object({
  subject:  z.string().min(5, 'Subject must be at least 5 characters'),
  category: z.enum(['withdrawal', 'investment', 'technical', 'other'], { required_error: 'Select a category' }),
  message:  z.string().min(20, 'Message must be at least 20 characters'),
})

const replySchema = z.object({
  message: z.string().min(5, 'Reply must be at least 5 characters'),
})

const CATEGORIES = ['withdrawal', 'investment', 'technical', 'other']

const TICKET_COLS = [
  { key: 'id',         label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
  { key: 'subject',    label: 'Subject', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
  { key: 'category',   label: 'Category', render: (v) => <span style={{ textTransform: 'capitalize', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{v}</span> },
  { key: 'status',     label: 'Status',   render: (v) => <Badge status={v} /> },
  { key: '_count',     label: 'Replies',  render: (v) => <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{v?.replies ?? 0} replies</span> },
  { key: 'created_at', label: 'Date',     render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>{new Date(v).toLocaleDateString()}</span> },
]

/* ── Create Ticket Form ── */
function CreateTicket({ onCreated, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(createSchema) })

  const onSubmit = async (data) => {
    try {
      await api.post('/tickets/create', data)
      toast.success('Support ticket created. Our team will respond shortly.')
      onCreated()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create ticket')
    }
  }

  return (
    <Panel className="scale-in" style={{ maxWidth: 700 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LifeBuoy size={18} style={{ color: 'var(--cyan)' }} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>New Support Ticket</h3>
          </div>
          <button type="button" onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}><XCircle size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} id="ticket-meta">
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Category</label>
            <select {...register('category')} className="input capitalize">
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            {errors.category && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.category.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Subject</label>
            <input {...register('subject')} placeholder="What is this about?" className="input" />
            {errors.subject && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.subject.message}</p>}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Message</label>
          <textarea {...register('message')} rows={6} placeholder="Describe your issue in detail…" className="input resize-none" />
          {errors.message && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.message.message}</p>}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, height: 44 }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> <span>Submit Ticket</span></>}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, height: 44 }}>Discard</button>
        </div>
      </form>
      <style>{`
        @media (max-width: 639px) { #ticket-meta { grid-template-columns: 1fr !important; } }
      `}</style>
    </Panel>
  )
}

/* ── Ticket Detail / Reply ── */
function TicketDetail({ ticketId, onBack }) {
  const { user } = useAuthStore()
  const [ticket,     setTicket]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [closing,    setClosing]    = useState(false)
  const bottomRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(replySchema),
  })

  const loadTicket = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/tickets/${ticketId}`)
      setTicket(data.ticket)
    } catch { toast.error('Could not load ticket chat') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTicket() }, [ticketId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.replies])

  const onReply = async (data) => {
    try {
      await api.post(`/tickets/${ticketId}/reply`, data)
      reset()
      loadTicket()
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to transmit reply') }
  }

  const onClose = async () => {
    if (!confirm('Mark this communication as resolved?')) return
    setClosing(true)
    try {
      await api.put(`/tickets/${ticketId}/close`)
      toast.success('Ticket closed')
      loadTicket()
    } finally { setClosing(false) }
  }

  if (loading) return <Spinner />
  if (!ticket) return null

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} className="hover-white"><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{ticket.subject}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <Badge status={ticket.status} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID: {ticket.id} · {ticket.category}</span>
          </div>
        </div>
        {ticket.status !== 'closed' && (
          <button onClick={onClose} disabled={closing} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
            {closing ? <Loader2 size={14} className="animate-spin" /> : 'Mark Resolved'}
          </button>
        )}
      </div>

      {/* Conversation thread */}
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: 600, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }} className="custom-scrollbar">
          {/* Original message */}
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
             <div style={{ background: 'var(--purple-glow)', border: '1px solid var(--border-purple)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md) var(--radius-sm) 0 var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   <User size={12} style={{ color: 'var(--purple)' }} />
                   <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase' }}>{user?.name || 'User'}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.message}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.75rem', textAlign: 'right' }}>{new Date(ticket.created_at).toLocaleString()}</p>
             </div>
          </div>

          {/* Replies */}
          {ticket.replies?.map((reply) => (
            <div key={reply.id} style={{ alignSelf: reply.is_admin ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
              <div style={{ 
                background: reply.is_admin ? 'var(--cyan-glow)' : 'var(--purple-glow)', 
                border: `1px solid ${reply.is_admin ? 'var(--border-cyan)' : 'var(--border-purple)'}`, 
                padding: '1rem 1.25rem', 
                borderRadius: reply.is_admin ? 'var(--radius-sm) var(--radius-md) var(--radius-md) 0' : 'var(--radius-md) var(--radius-sm) 0 var(--radius-md)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   {reply.is_admin ? <ShieldCheck size={12} style={{ color: 'var(--cyan)' }} /> : <User size={12} style={{ color: 'var(--purple)' }} />}
                   <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: reply.is_admin ? 'var(--cyan)' : 'var(--purple)', textTransform: 'uppercase' }}>
                      {reply.is_admin ? 'Support Team' : (reply.user?.name || 'User')}
                   </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply.message}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.75rem', textAlign: 'right' }}>{new Date(reply.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply form */}
        {ticket.status !== 'closed' ? (
          <form onSubmit={handleSubmit(onReply)} style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <textarea {...register('message')} placeholder="Type your reply here…" style={{ height: 60 }} className="input resize-none flex-1" />
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: 60, height: 60, padding: 0 }}>
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
        ) : (
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              This ticket is closed. <button onClick={() => setView('create')} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 700, cursor: 'pointer' }}>Create a new ticket</button> for further assistance.
            </p>
          </div>
        )}
        {errors.message && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.message.message}</p>}
      </Panel>
    </div>
  )
}

/* ── Main ── */
export default function TicketsPage() {
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('list')
  const [selId,    setSelId]    = useState(null)

  const loadTickets = async () => {
    setLoading(true)
    api.get('/tickets')
      .then(({ data }) => setTickets(data.tickets || []))
      .catch(() => toast.error('Could not load tickets'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTickets() }, [])

  const ticketCols = [
    ...TICKET_COLS,
    { key: 'id', label: 'Action', render: (id) => (
      <button onClick={() => { setSelId(id); setView('detail') }} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }} className="hover-glow">
        INSPECT →
      </button>
    )},
  ]

  if (view === 'create') return <CreateTicket onCreated={() => { loadTickets(); setView('list') }} onCancel={() => setView('list')} />
  if (view === 'detail') return <TicketDetail ticketId={selId} onBack={() => { loadTickets(); setView('list') }} />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Support Tickets"
        subtitle="Need help? Create a ticket and our team will get back to you"
        action={
          <button onClick={() => setView('create')} className="btn-primary" style={{ padding: '0 1.25rem' }}>
            <Plus size={18} /> <span>Create Ticket</span>
          </button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--gap-md)' }}>
        {[
          { label: 'Total Tickets', value: tickets.length, color: 'var(--text-primary)', icon: MessageSquare },
          { label: 'Pending Response', value: tickets.filter((t) => t.status === 'open').length, color: 'var(--cyan)', icon: Clock },
          { label: 'Resolved Tickets', value: tickets.filter((t) => t.status === 'closed').length, color: 'var(--green)', icon: ShieldCheck },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ padding: '1rem 1.25rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
             </div>
             <div>
                <p style={{ fontSize: '1.125rem', fontWeight: 900, color }}>{value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</p>
             </div>
          </div>
        ))}
      </div>

      {loading ? <Spinner /> : (
        tickets.length === 0 ? (
          <Panel style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <MessageSquare size={32} style={{ color: 'var(--cyan)' }} />
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>No support tickets found.</p>
            <button onClick={() => setView('create')} className="btn-primary" style={{ margin: '0 auto' }}>Create Your First Ticket</button>
          </Panel>
        ) : (
          <div className="scale-in">
            <DataTable columns={ticketCols} data={tickets} emptyText="No tickets found matching current parameters." />
          </div>
        )
      )}
    </div>
  )
}
