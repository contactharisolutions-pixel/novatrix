import { TrendingUp, DollarSign, Briefcase, Users, Cpu, Lock } from 'lucide-react'

const SERVICES = [
  {
    icon: TrendingUp,
    title: 'Smart Crypto Trading',
    desc: 'AI-assisted signals and professional execution on major crypto pairs — BTC, ETH, BNB, and more.',
    color: 'var(--cyan)',
    glow: 'rgba(0,212,255,0.1)',
    border: 'rgba(0,212,255,0.15)',
  },
  {
    icon: DollarSign,
    title: 'Forex Trading',
    desc: 'EUR/GBP, USD/JPY and 20+ carefully selected forex pairs managed by our expert trading desk.',
    color: 'var(--purple)',
    glow: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.15)',
  },
  {
    icon: Briefcase,
    title: 'Managed Investments',
    desc: 'Hands-off portfolio management for consistent passive income. You invest, we trade.',
    color: 'var(--orange)',
    glow: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.15)',
  },
  {
    icon: Users,
    title: 'Referral Earnings',
    desc: 'Earn direct & multi-level commissions from your network\'s trading activity across 10 levels.',
    color: 'var(--green)',
    glow: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.15)',
  },
  {
    icon: Cpu,
    title: 'Smart Technology',
    desc: 'Automated trading bots, real-time analytics, and a transparent daily reporting dashboard.',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Lock,
    title: 'Secure Platform',
    desc: '2FA, OTP verification, encrypted wallets, and transaction PIN protection on every action.',
    color: 'var(--red)',
    glow: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.15)',
  },
]

export default function ServicesSection() {
  return (
    <section id="services" style={{ background: 'rgba(255,255,255,0.01)' }} className="section">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> Our Services
          </div>
          <h2 className="section-title">
            Everything You Need to{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Earn &amp; Grow</span>
          </h2>
          <p className="section-subtitle">
            From intelligent market trading to a powerful referral network — Novatrix gives you every
            tool to maximise your returns.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.25rem',
        }} id="services-grid">
          {SERVICES.map(({ icon: Icon, title, desc, color, glow, border }) => (
            <div
              key={title}
              style={{
                background: 'var(--navy-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '1.75rem',
                transition: 'all 0.25s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = border
                e.currentTarget.style.background = `linear-gradient(135deg, var(--navy-card), ${glow})`
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--navy-card)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 13,
                background: glow, border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.125rem',
                transition: 'transform 0.25s',
              }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          #services-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          #services-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
