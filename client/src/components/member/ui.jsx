/* ─── Shared Member UI Primitives ───────────────────────────── */

/** Stat card used across member dashboard and summary pages */
export function StatCard({ label, value, sub, icon: Icon, color = 'cyan' }) {
  const palette = {
    cyan:   { accent: 'var(--cyan)',   glow: 'rgba(0,212,255,0.1)',    border: 'rgba(0,212,255,0.15)'    },
    purple: { accent: 'var(--purple)', glow: 'rgba(124,58,237,0.1)',   border: 'rgba(124,58,237,0.15)'   },
    green:  { accent: 'var(--green)',  glow: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.15)'   },
    orange: { accent: 'var(--orange)', glow: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.15)'   },
    red:    { accent: 'var(--red)',    glow: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.15)'    },
  }
  const p = palette[color] || palette.cyan

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--navy-card) 0%, var(--navy-elevated) 100%)`,
      border: `1px solid ${p.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem 1.375rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
      transition: 'var(--transition-normal)',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = `var(--shadow-md), 0 0 20px ${p.glow}`
      e.currentTarget.style.borderColor = p.accent
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'none'
      e.currentTarget.style.boxShadow = 'none'
      e.currentTarget.style.borderColor = p.border
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: p.glow,
          border: `1px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon size={18} style={{ color: p.accent }} />}
        </div>
        {sub && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>{sub}</span>}
      </div>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </p>
        <p style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  )
}

/** Section heading used inside dashboard pages */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 'var(--gap-lg)', paddingBottom: 'var(--gap-md)',
      borderBottom: '1px solid var(--border)', gap: 'var(--gap-md)',
    }}>
      <div>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif',
          color: 'var(--text-primary)', lineHeight: 1,
        }}>{title}</h1>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, paddingBottom: '2px' }}>{action}</div>}
    </div>
  )
}

/** Loading spinner */
export function Spinner({ size = 32 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: '3px solid rgba(0,212,255,0.1)',
        borderTopColor: 'var(--cyan)',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/** Status badge */
export function Badge({ status }) {
  const map = {
    pending:   { bg: 'rgba(245,158,11,0.08)',  text: '#f59e0b', border: 'rgba(245,158,11,0.2)'  },
    approved:  { bg: 'rgba(16,185,129,0.08)',  text: '#10b981', border: 'rgba(16,185,129,0.2)'  },
    rejected:  { bg: 'rgba(239,68,68,0.08)',   text: '#ef4444', border: 'rgba(239,68,68,0.2)'   },
    active:    { bg: 'rgba(0,212,255,0.08)',   text: '#00d4ff', border: 'rgba(0,212,255,0.2)'   },
    completed: { bg: 'rgba(100,116,139,0.08)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
    open:        { bg: 'rgba(59,130,246,0.08)',  text: '#3b82f6', border: 'rgba(59,130,246,0.2)'  },
    in_progress: { bg: 'rgba(124,58,237,0.08)',  text: '#7c3aed', border: 'rgba(124,58,237,0.2)'  },
    closed:      { bg: 'rgba(100,116,139,0.08)', text: '#94a3b8', border: 'rgba(100,116,139,0.2)' },
  }
  const s = map[status?.toLowerCase()] || map.completed
  return (
    <span className="badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  )
}

/** Data table wrapper */
export function DataTable({ columns, data, emptyText = 'No records found.' }) {
  if (!data?.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '3.5rem 1rem',
        color: 'var(--text-faint)', fontSize: '0.875rem',
        background: 'var(--navy-card)', borderRadius: 14,
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>📭</div>
        {emptyText}
      </div>
    )
  }
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row, i) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Copy-to-clipboard input */
export function CopyInput({ value, label }) {
  const copy = () => {
    navigator.clipboard.writeText(value)
  }
  return (
    <div>
      {label && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{label}</p>}
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <input
          readOnly
          value={value}
          className="input mono"
          style={{ fontSize: '0.8125rem', flex: 1 }}
        />
        <button onClick={copy} className="btn-secondary" style={{ padding: '0.65rem 1rem', fontSize: '0.8125rem', flexShrink: 0 }}>
          Copy
        </button>
      </div>
    </div>
  )
}

/** Panel wrapper with surface styles */
export function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--navy-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1.375rem 1.5rem',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Panel title */
export function PanelTitle({ children, icon: Icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.125rem' }}>
      {Icon && <Icon size={15} style={{ color: 'var(--cyan)' }} />}
      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{children}</p>
    </div>
  )
}
