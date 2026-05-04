import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Megaphone, Calendar, Users, Target, Zap, AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminTable, AdminModal, AdminSpinner } from '../../components/admin/ui'

const PRIORITY_BADGE = {
  normal: { icon: Info,          color: 'var(--cyan)',   bg: 'rgba(0,212,255,0.05)',   border: 'var(--border-cyan)'   },
  high:   { icon: AlertTriangle, color: 'var(--orange)', bg: 'rgba(249,115,22,0.05)',   border: 'var(--border-orange)' },
  urgent: { icon: Zap,           color: 'var(--red)',    bg: 'rgba(239,68,68,0.05)',    border: 'var(--border-red)'    },
}

function AnnForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: '', body: '', priority: 'normal', target: 'all',
    target_user_id: '', published_at: '',
    ...initial,
    published_at: initial?.published_at
      ? new Date(initial.published_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Broadcast Title</label>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input" placeholder="Primary message header…" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Broadcast Content</label>
        <textarea value={form.body} onChange={(e) => set('body', e.target.value)} required rows={5} className="input resize-none" placeholder="Detailed informative body content…" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} id="ann-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Urgency Level</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="input">
            <option value="normal">Normal notice</option>
            <option value="high">Important stream</option>
            <option value="urgent">Critical broadcast</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Transmission Target</label>
          <select value={form.target} onChange={(e) => set('target', e.target.value)} className="input">
            <option value="all">Global ecosystem</option>
            <option value="specific">Targeted entity</option>
          </select>
        </div>
      </div>

      {form.target === 'specific' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Target Entity User ID</label>
          <input value={form.target_user_id} onChange={(e) => set('target_user_id', e.target.value)} className="input" placeholder="Internal system ID…" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Scheduled Activation</label>
        <input type="datetime-local" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} className="input" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, height: 48 }}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : (initial?.id ? 'Adjust Broadcast' : 'Deploy Broadcast')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, height: 48 }}>
          Discard
        </button>
      </div>
      <style>{`
        @media (max-width: 500px) { #ann-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </form>
  )
}

export default function AnnouncementsPage() {
  const [anns,    setAnns]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/announcements')
      setAnns(data.announcements || [])
    } catch { toast.error('Could not retrieve broadcast registry') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const save = async (form) => {
    setSaving(true)
    try {
      if (modal?.edit) {
        await adminApi.put(`/announcements/${modal.edit.id}`, form)
        toast.success('Broadcast updated successfully.')
      } else {
        await adminApi.post('/announcements', form)
        toast.success('New broadcast deployed.')
      }
      setModal(null)
      load()
    } catch (err) { toast.error(err?.response?.data?.error || 'Broadcast operation failed') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Mark this broadcast for permanent deletion?')) return
    try {
      await adminApi.delete(`/announcements/${id}`)
      toast.success('Broadcast purged.')
      load()
    } catch { toast.error('Purge operation failed') }
  }

  const COLS = [
    { key: 'id',           label: 'ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{v}</span> },
    { key: 'title',        label: 'Subject', render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{v}</span> },
    { key: 'priority',     label: 'Urgency', render: (v) => {
       const cfg = PRIORITY_BADGE[v] || PRIORITY_BADGE.normal
       return (
         <span style={{ 
           display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', 
           borderRadius: 100, fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', 
           background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` 
         }}>
            <cfg.icon size={10} /> {v}
         </span>
       )
    }},
    { key: 'target',       label: 'Transmission', render: (v) => <span style={{ textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{v}</span> },
    { key: 'published_at', label: 'Activation', render: (v) => v ? <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(v).toLocaleDateString()}</span> : <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>Draft Pipeline</span> },
    { key: 'created_by_admin', label: 'Authorized By', render: (v) => <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 800 }}>{v?.name}</span> },
    {
      key: 'id', label: 'Command',
      render: (id, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setModal({ edit: row })} className="btn-secondary" style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)' }}>
            <Pencil size={14} />
          </button>
          <button onClick={() => del(id)} className="btn-secondary" style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <AdminPageHeader
        title="Broadcast Nexus"
        subtitle={`System managing ${anns.length} ecosystem communication streams`}
        action={
          <button onClick={() => setModal('create')} className="btn-primary" style={{ padding: '0 1.25rem' }}>
            <Plus size={18} /> <span>New Broadcast</span>
          </button>
        }
      />

      {loading ? <AdminSpinner /> : <AdminTable columns={COLS} data={anns} emptyText="No active broadcast streams detected in the registry." />}

      {(modal === 'create' || modal?.edit) && (
        <AdminModal title={modal?.edit ? 'Modify Stream' : 'Establish Broadcast'} onClose={() => setModal(null)}>
          <AnnForm initial={modal?.edit} onSave={save} onCancel={() => setModal(null)} saving={saving} />
        </AdminModal>
      )}
    </div>
  )
}
