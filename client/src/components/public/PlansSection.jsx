import { Link } from 'react-router-dom'
import { Check, Star, Zap, Crown, ArrowRight } from 'lucide-react'

const PLANS = [
  {
    icon: Zap,
    name: 'Starter',
    min: '$50',
    max: '$499',
    roi: '0.5%',
    duration: 'Until 2× return',
    features: [
      'Daily ROI credited to wallet',
      'Direct referral bonus',
      'Level bonus (15 levels)',
      'Basic analytics dashboard',
      'Email & ticket support',
    ],
    featured: false,
    accent: 'var(--cyan)',
    glow: 'rgba(0,212,255,0.08)',
    border: 'rgba(0,212,255,0.15)',
  },
  {
    icon: Star,
    name: 'Standard',
    min: '$500',
    max: '$4,999',
    roi: '1.0%',
    duration: 'Until 2× return',
    features: [
      'Higher daily ROI',
      'Direct referral bonus',
      'Level bonus (15 levels)',
      'Priority support queue',
      'Detailed trade reports',
    ],
    featured: true,
    badge: 'Most Popular',
    accent: 'var(--purple)',
    glow: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.3)',
  },
  {
    icon: Crown,
    name: 'Premium',
    min: '$5,000',
    max: 'Unlimited',
    roi: '2.0%',
    duration: 'Until 2× return',
    features: [
      'Maximum daily ROI',
      'Direct referral bonus',
      'Level bonus (15 levels)',
      'Dedicated account manager',
      '24/7 VIP support line',
    ],
    featured: false,
    accent: 'var(--orange)',
    glow: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.15)',
  },
]

export default function PlansSection() {
  return (
    <section id="plans" className="section">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> Investment Plans
          </div>
          <h2 className="section-title">
            Choose Your{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Growth Plan</span>
          </h2>
          <p className="section-subtitle">
            All plans run until you reach 2× your invested amount. Profits are credited daily
            to your Income Wallet and withdrawable at any time.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} id="plans-grid">
          {PLANS.map(({ icon: Icon, name, min, max, roi, duration, features, featured, badge, accent, glow, border }) => (
            <div
              key={name}
              style={{
                background: featured
                  ? `linear-gradient(135deg, var(--navy-card) 0%, ${glow.replace('0.1)', '0.15)')} 100%)`
                  : 'var(--navy-card)',
                border: `1px solid ${featured ? border : 'var(--border)'}`,
                borderRadius: 20,
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s',
                boxShadow: featured ? `0 0 48px ${glow.replace('0.1)', '0.12)')}` : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px ${border}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = featured ? `0 0 48px ${glow.replace('0.1)', '0.12)')}` : 'none'
              }}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                opacity: featured ? 1 : 0.5,
              }} />

              {/* Popular badge */}
              {badge && (
                <div style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                  color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                  padding: '0.25rem 0.75rem', borderRadius: 100, letterSpacing: '0.05em',
                }}>
                  {badge}
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 13,
                background: glow, border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <Icon size={22} style={{ color: accent }} />
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', marginBottom: '0.25rem' }}>
                {name}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Investment: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{min}</span> – {max}
              </p>

              {/* ROI highlight */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem',
              }}>
                <div style={{
                  fontSize: '3rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', lineHeight: 1,
                  background: `linear-gradient(135deg, ${accent}, ${accent === 'var(--purple)' ? 'var(--cyan)' : 'var(--purple)'})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  marginBottom: '0.375rem',
                }}>{roi}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Daily ROI</div>
                <div style={{ color: 'var(--text-faint)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{duration}</div>
              </div>

              {/* Features */}
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                {features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Check size={10} style={{ color: 'var(--green)' }} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.875rem',
                  background: featured ? `linear-gradient(135deg, var(--cyan), var(--purple))` : 'rgba(255,255,255,0.05)',
                  color: featured ? '#fff' : 'var(--text-secondary)',
                  border: featured ? 'none' : `1px solid ${border}`,
                  borderRadius: 12, fontWeight: 600, fontSize: '0.9375rem',
                  textDecoration: 'none', transition: 'all 0.25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
              >
                Get Started <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.8125rem', marginTop: '2rem', lineHeight: 1.7 }}>
          * Returns are generated through professional Crypto &amp; Forex trading. Past performance is not a guarantee of future results.
          Please read our <Link to="/disclaimer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Disclaimer</Link> before investing.
        </p>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #plans-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
