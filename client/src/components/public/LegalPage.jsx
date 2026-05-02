/** Premium legal page template reused for Privacy, Terms, and Disclaimer */
export default function LegalPage({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', paddingTop: '7rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: 780 }}>
        {/* Header */}
        <div style={{
          marginBottom: '2.5rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--cyan)',
            }}>◆ Legal</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.875rem, 4vw, 2.75rem)',
            fontWeight: 900, fontFamily: 'Outfit, sans-serif',
            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: '0.5rem',
            lineHeight: 1.15,
          }}>
            {title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Content card */}
        <div style={{
          background: 'var(--navy-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2.25rem',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}
