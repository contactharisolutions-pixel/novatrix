import { Eye, Zap, Shield, Users, HeadphonesIcon, BadgeDollarSign } from 'lucide-react'

const REASONS = [
  {
    icon: Eye,
    title: '100% Transparent',
    desc: 'Every trade and earning is logged. Full daily reports available in your dashboard.',
    color: 'var(--cyan)',
    glow: 'rgba(0,212,255,0.1)',
  },
  {
    icon: Zap,
    title: 'Instant Referral Bonus',
    desc: 'Get paid immediately when your referrals deposit and activate a trade package.',
    color: 'var(--amber)',
    glow: 'rgba(245,158,11,0.1)',
  },
  {
    icon: Shield,
    title: 'Secure Withdrawals',
    desc: 'USDT (BEP20) payouts with transaction PIN protection and TxHash verification.',
    color: 'var(--green)',
    glow: 'rgba(16,185,129,0.1)',
  },
  {
    icon: Users,
    title: 'Multi-Level Commissions',
    desc: "Earn from 10 levels of your downline team's trading activity — every single day.",
    color: 'var(--purple)',
    glow: 'rgba(124,58,237,0.1)',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    desc: 'Our support team is available around the clock via Telegram and ticket system.',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.1)',
  },
  {
    icon: BadgeDollarSign,
    title: 'No Hidden Fees',
    desc: 'Only a transparent withdrawal processing fee. No registration fees, no surprises.',
    color: 'var(--orange)',
    glow: 'rgba(249,115,22,0.1)',
  },
]

export default function WhyUsSection() {
  return (
    <section id="why-us" className="section">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> Why Choose Us
          </div>
          <h2 className="section-title">
            Built for{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Trust &amp; Growth</span>
          </h2>
          <p className="section-subtitle">
            Thousands of members trust Novatrix for one reason — we deliver on our promise.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }} id="whyus-grid">
          {REASONS.map(({ icon: Icon, title, desc, color, glow }) => (
            <div
              key={title}
              style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                padding: '1.5rem',
                background: 'var(--navy-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                transition: 'all 0.25s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${color}35`
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: glow,
                border: `1px solid ${color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          #whyus-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          #whyus-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
