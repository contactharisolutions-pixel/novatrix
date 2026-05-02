/* ─── Shared Admin UI Primitives ────────────────────────────── */

export function AdminPageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '2rem', paddingBottom: '1.5rem',
      borderBottom: '1px solid var(--border)', gap: '1rem',
      flexWrap: 'wrap'
    }} className="fade-in">
      <div>
        <h2 style={{
          fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif',
          color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em'
        }}>{title}</h2>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

export function AdminStatCard({ label, value, icon: Icon, color = 'orange', sub }) {
  const palette = {
    orange: { accent: 'var(--orange)', glow: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)'  },
    red:    { accent: 'var(--red)',    glow: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'   },
    green:  { accent: 'var(--green)',  glow: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)'  },
    blue:   { accent: '#3b82f6',       glow: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)'  },
    purple: { accent: 'var(--purple)', glow: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.2)'  },
    cyan:   { accent: 'var(--cyan)',   glow: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.2)'   },
  }
  const p = palette[color] || palette.orange

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: `1px solid var(--border)`,
      borderRadius: 'var(--radius-lg)', padding: '1.5rem',
      transition: 'var(--transition-normal)', position: 'relative', overflow: 'hidden',
    }}
    className="hover-glow"
    >
      {/* status indicator */}
      <div style={{ position: 'absolute', left: 0, top: '1.5rem', bottom: '1.5rem', width: 3, background: p.accent, borderRadius: '0 4px 4px 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </p>
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: p.glow, border: `1px solid ${p.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} style={{ color: p.accent }} />
          </div>
        )}
      </div>
      <p style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: 500 }}>{sub}</p>}
    </div>
  )
}

export function AdminTable({ columns, data, emptyText = 'No data.' }) {
  if (!data?.length) return (
    <div style={{
      textAlign: 'center', padding: '5rem 1rem',
      color: 'var(--text-faint)', fontSize: '0.9375rem',
      background: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
    }} className="scale-in">
      <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>📭</div>
      <p style={{ fontWeight: 600 }}>{emptyText}</p>
    </div>
  )
  return (
    <div className="data-table-wrap scale-in" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row[c.key], row, i) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:     { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)'  },
    approved:    { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.25)'  },
    rejected:    { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)'   },
    active:      { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.25)'  },
    inactive:    { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
    blocked:     { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)'   },
    open:        { bg: 'rgba(59,130,246,0.1)',  text: '#3b82f6', border: 'rgba(59,130,246,0.25)'  },
    in_progress: { bg: 'rgba(249,115,22,0.1)',  text: '#f97316', border: 'rgba(249,115,22,0.25)'  },
    closed:      { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
    completed:   { bg: 'rgba(16,185,129,0.1)',  text: '#10b981', border: 'rgba(16,185,129,0.25)'  },
  }
  const s = map[status] || map.inactive
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.25rem 0.75rem', borderRadius: 100,
      fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em',
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export function AdminModal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
        className="fade-in"
        onClick={onClose}
      />
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: 520,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column'
      }} className="scale-in">
        {/* Top accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, var(--orange), var(--red))' }} />
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 900, fontSize: '1.125rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition-normal)', fontSize: '1.25rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AdminSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(249,115,22,0.1)',
        borderTopColor: 'var(--orange)',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null
  const visiblePages = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
    if (pages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= pages - 3) return pages - 6 + i
    return page - 3 + i
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
          background: 'var(--panel-bg)', color: 'var(--text-muted)', fontWeight: 700,
          border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer',
          opacity: page === 1 ? 0.35 : 1, transition: 'var(--transition-normal)',
        }}
      >
        ← Prev
      </button>

      {visiblePages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 800,
            background: p === page ? 'var(--orange-glow)' : 'var(--panel-bg)',
            color: p === page ? 'var(--orange)' : 'var(--text-muted)',
            border: p === page ? '1px solid var(--orange)' : '1px solid var(--border)',
            cursor: 'pointer', transition: 'var(--transition-normal)',
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page === pages}
        style={{
          padding: '0.625rem 1.125rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
          background: 'var(--panel-bg)', color: 'var(--text-muted)', fontWeight: 700,
          border: '1px solid var(--border)', cursor: page === pages ? 'not-allowed' : 'pointer',
          opacity: page === pages ? 0.35 : 1, transition: 'var(--transition-normal)',
        }}
      >
        Next →
      </button>
    </div>
  )
}

export function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Badge({ children, status }) {
  return (
    <span style={{
      background: 'rgba(249,115,22,0.1)',
      color: 'var(--orange)',
      border: '1px solid rgba(249,115,22,0.25)',
      padding: '0.2rem 0.6rem',
      borderRadius: 100,
      fontSize: '0.7rem',
      fontWeight: 800,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }}>
      {children || status}
    </span>
  )
}

