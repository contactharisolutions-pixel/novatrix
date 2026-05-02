import { useEffect, useState } from 'react'
import { Bell, Megaphone, ChevronDown, ChevronUp, Info, AlertTriangle, Zap, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Spinner, Panel } from '../../components/member/ui'

const PRIORITY_CONFIG = {
  urgent: { icon: Zap,           color: 'var(--red)',    bg: 'rgba(239,68,68,0.05)',    border: 'var(--border-red)',    label: 'Urgent' },
  high:   { icon: AlertTriangle, color: 'var(--orange)', bg: 'rgba(249,115,22,0.05)',   border: 'var(--border-orange)', label: 'Important' },
  normal: { icon: Info,          color: 'var(--cyan)',   bg: 'rgba(0,212,255,0.05)',   border: 'var(--border-cyan)',   label: 'Notice'    },
}

function AnnouncementCard({ ann }) {
  const [open, setOpen] = useState(ann.priority === 'urgent')
  const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal
  const Icon = cfg.icon

  return (
    <Panel style={{ padding: 0, overflow: 'hidden', border: `1px solid ${open ? cfg.color : 'var(--border)'}`, background: open ? cfg.bg : 'var(--panel-bg)', transition: 'var(--transition-normal)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'start', gap: '1rem', padding: '1.25rem',
          textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer'
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ann.title}</span>
            <span style={{
              fontSize: '0.625rem', padding: '0.125rem 0.625rem', borderRadius: '100px',
              border: `1px solid ${cfg.color}`, color: cfg.color, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
            <Calendar size={12} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 600 }}>
              {new Date(ann.published_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ color: 'var(--text-faint)', marginTop: '0.5rem' }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="scale-in" style={{ padding: '0 1.25rem 1.5rem 4rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ann.body}</p>
        </div>
      )}
    </Panel>
  )
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    api.get('/announcements')
      .then(({ data }) => setAnnouncements(data.announcements || []))
      .catch(() => toast.error('Could not load announcements'))
      .finally(() => setLoading(false))
  }, [])

  const urgent = announcements.filter((a) => a.priority === 'urgent')
  const rest   = announcements.filter((a) => a.priority !== 'urgent')

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', maxWidth: 800 }}>
      <PageHeader title="Announcements" subtitle="Latest system updates and important news from the admin" />

      {loading ? <Spinner /> : (
        announcements.length === 0 ? (
          <Panel style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Megaphone size={48} style={{ color: 'var(--text-faint)', margin: '0 auto 1.5rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No announcements found.</p>
          </Panel>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
            {urgent.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                   <Zap size={16} style={{ color: 'var(--red)' }} />
                   <p style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Urgent Updates</p>
                </div>
                {urgent.map((a) => <AnnouncementCard key={a.id} ann={a} />)}
              </div>
            )}
            
            {rest.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)', marginTop: urgent.length > 0 ? '1rem' : 0 }}>
                {urgent.length > 0 && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <Bell size={16} style={{ color: 'var(--text-faint)' }} />
                      <p style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Global Feed</p>
                   </div>
                )}
                {rest.map((a) => <AnnouncementCard key={a.id} ann={a} />)}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
