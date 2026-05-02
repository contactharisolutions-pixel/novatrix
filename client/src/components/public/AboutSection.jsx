import { Shield, Users, Globe, Calendar, CheckCircle2 } from 'lucide-react'

const STATS = [
  { icon: Users,    value: '50,000+', label: 'Members Worldwide' },
  { icon: Globe,    value: '80+',     label: 'Countries Active'  },
  { icon: Shield,   value: '100%',    label: 'Transparent'       },
  { icon: Calendar, value: '2022',    label: 'Founded'           },
]

const HIGHLIGHTS = [
  'Professional trading team with 10+ years of experience',
  'Transparent daily reports for every active trade',
  'Regulated USDT (BEP20) deposit & withdrawal system',
]

export default function AboutSection() {
  return (
    <section id="about" className="section">
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '4rem',
          alignItems: 'center',
        }} id="about-grid">
          {/* Text side */}
          <div>
            <div className="section-tag">
              <span>◆</span> About Us
            </div>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 900,
              fontFamily: 'Outfit, sans-serif',
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em',
            }}>
              A Smarter Way to{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Grow Your Capital</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
              Novatrix is a modern digital investment platform focused on smart growth through Crypto
              &amp; Forex markets. Our team of professional traders and quantitative analysts develop
              strategies that deliver consistent, transparent returns.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
              We combine cutting-edge algorithmic trading with a community-driven referral network,
              allowing every member to earn not just from their own investment but from the growth
              of their team.
            </p>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {HIGHLIGHTS.map((point) => (
                <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={17} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: '0.15rem' }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                style={{
                  background: 'var(--navy-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  transition: 'all 0.25s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}>
                  <Icon size={22} style={{ color: 'var(--cyan)' }} />
                </div>
                <div style={{
                  fontSize: '2rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', marginBottom: '0.375rem',
                }}>{value}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #about-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}
