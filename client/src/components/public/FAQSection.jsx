import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQS = [
  {
    q: 'What is Novatrix?',
    a: 'Novatrix is a professional Crypto & Forex investment platform where your funds are managed by expert traders. You earn daily ROI until you reach 2× your invested amount, plus team bonuses from your referral network.',
  },
  {
    q: 'How do I start investing?',
    a: 'Register an account, deposit USDT (BEP20) into your Fund Wallet (minimum $50), then activate a trade package. Daily profits start crediting to your Income Wallet from the next business day.',
  },
  {
    q: 'How are profits generated?',
    a: 'Our professional trading team and algorithmic bots trade on Crypto and Forex markets 24/7. Profits from the combined trading pool are distributed proportionally to all active package holders.',
  },
  {
    q: 'How do I withdraw my earnings?',
    a: 'Submit a withdrawal request from your Income Wallet. Minimum withdrawal is $10. Funds are sent to your registered BEP20 USDT wallet address, usually within 24 hours of approval.',
  },
  {
    q: 'Is my investment safe?',
    a: 'All trading is conducted by professionals with strict risk management. However, all investments carry inherent risk. We recommend only investing what you can afford and diversifying accordingly.',
  },
  {
    q: 'How does the referral program work?',
    a: "When you refer a member and they invest, you earn a direct referral bonus. Additionally, you earn level bonuses from up to 15 levels of your downline's daily trading activity.",
  },
  {
    q: 'What is the minimum withdrawal amount?',
    a: 'The minimum withdrawal is $10 from your Income Wallet. A processing fee applies. Withdrawals are sent to your BEP20 USDT wallet address on file.',
  },
  {
    q: 'What cryptocurrencies and markets do you trade?',
    a: 'We trade major crypto pairs (BTC/USDT, ETH/USDT, BNB/USDT) and forex pairs including EUR/GBP, USD/JPY, GBP/USD, and 15+ additional pairs selected by our trading team.',
  },
]

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null)
  const toggle = (i) => setOpenIdx(openIdx === i ? null : i)

  return (
    <section id="faq" style={{ background: 'rgba(255,255,255,0.01)' }} className="section">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> FAQ
          </div>
          <h2 className="section-title">
            Frequently Asked{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Questions</span>
          </h2>
          <p className="section-subtitle">
            Got questions? We've got answers. If you need more help, reach out via our support system.
          </p>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {FAQS.map(({ q, a }, i) => (
            <div
              key={q}
              style={{
                borderBottom: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggle(i)}
                aria-expanded={openIdx === i}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1.25rem 0',
                  background: 'transparent',
                  border: 'none',
                  color: openIdx === i ? 'var(--cyan)' : 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'color 0.2s',
                }}
              >
                <span>{q}</span>
                <ChevronDown
                  size={18}
                  style={{
                    color: 'var(--cyan)',
                    flexShrink: 0,
                    transition: 'transform 0.3s',
                    transform: openIdx === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
              <div
                style={{
                  maxHeight: openIdx === i ? 300 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s ease, padding 0.35s',
                  paddingBottom: openIdx === i ? '1.25rem' : 0,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                  fontSize: '0.9375rem',
                }}
              >
                {a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
