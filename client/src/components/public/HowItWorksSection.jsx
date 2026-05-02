import { UserPlus, Wallet, BarChart2, TrendingUp } from 'lucide-react'

const STEPS = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create Account',
    desc: 'Register with your referral link. Takes less than 2 minutes with basic details.',
  },
  {
    icon: Wallet,
    number: '02',
    title: 'Fund Your Wallet',
    desc: 'Deposit USDT (BEP20) starting from $50. Funds are credited within minutes.',
  },
  {
    icon: BarChart2,
    number: '03',
    title: 'Start Trading',
    desc: 'Activate a trade package. Our team trades on your behalf 24/7 across markets.',
  },
  {
    icon: TrendingUp,
    number: '04',
    title: 'Earn Daily Returns',
    desc: 'Receive daily profits until you reach 2× your invested amount. Withdraw anytime.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> How It Works
          </div>
          <h2 className="section-title">
            Start Earning in{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>4 Simple Steps</span>
          </h2>
          <p className="section-subtitle">
            From registration to daily returns — getting started on Novatrix is fast, simple, and transparent.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', position: 'relative' }} id="hiw-grid">
          {/* Connector line (desktop only) */}
          <div style={{
            display: 'none',
            position: 'absolute',
            top: '2.25rem', left: '14%', right: '14%', height: 1,
            background: 'linear-gradient(90deg, var(--cyan), var(--purple), var(--cyan))',
            opacity: 0.15, zIndex: 0,
          }} id="hiw-connector" />

          {STEPS.map(({ icon: Icon, number, title, desc }) => (
            <div
              key={number}
              style={{
                background: 'var(--navy-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '2rem 1.5rem',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                transition: 'all 0.25s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                }}>
                  <Icon size={20} color="#fff" />
                </div>
              </div>
              <div style={{
                fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
                color: 'var(--cyan)', marginBottom: '0.625rem',
              }}>STEP {number}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          #hiw-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          #hiw-grid { grid-template-columns: repeat(4, 1fr) !important; }
          #hiw-connector { display: block !important; }
        }
      `}</style>
    </section>
  )
}
