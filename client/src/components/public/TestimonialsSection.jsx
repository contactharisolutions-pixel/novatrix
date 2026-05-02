import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Arjun Mehta',
    location: 'Mumbai, India',
    initials: 'AM',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    rating: 5,
    quote: 'I started with the Starter plan and within 3 months I had 2× my investment. The daily earnings and transparent reports gave me full confidence.',
    earned: '$2,400',
    plan: 'Standard Plan',
  },
  {
    name: 'Sarah Williams',
    location: 'London, UK',
    initials: 'SW',
    gradient: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    rating: 5,
    quote: 'The referral system is incredible. My team of 84 members generates passive income every single day. Novatrix completely changed my financial life.',
    earned: '$8,760',
    plan: 'Premium Plan',
  },
  {
    name: 'Ahmed Al-Rashid',
    location: 'Dubai, UAE',
    initials: 'AA',
    gradient: 'linear-gradient(135deg, #f97316, #eab308)',
    rating: 5,
    quote: "Withdrawals are always processed on time. I've withdrawn 12 times and every single transaction came through within 24 hours. Highly recommend.",
    earned: '$5,100',
    plan: 'Standard Plan',
  },
  {
    name: 'Maria Santos',
    location: 'São Paulo, Brazil',
    initials: 'MS',
    gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
    rating: 5,
    quote: 'As someone new to investing, the platform is easy to understand. The support team answered all my questions instantly. Amazing experience!',
    earned: '$1,800',
    plan: 'Starter Plan',
  },
]

export default function TestimonialsSection() {
  const [idx, setIdx] = useState(0)
  const prev = () => setIdx((idx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setIdx((idx + 1) % TESTIMONIALS.length)
  const t = TESTIMONIALS[idx]

  return (
    <section id="testimonials" className="section">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{ justifyContent: 'center' }}>
            <span>◆</span> Testimonials
          </div>
          <h2 className="section-title">
            What Our{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Members Say</span>
          </h2>
          <p className="section-subtitle">
            Real stories from real members earning with Novatrix.
          </p>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Card */}
          <div style={{
            background: 'var(--navy-card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '2.25rem',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s',
          }}>
            {/* Quote icon */}
            <div style={{
              position: 'absolute', top: '1.5rem', right: '1.75rem',
              color: 'rgba(0,212,255,0.1)', pointerEvents: 'none',
            }}>
              <Quote size={56} />
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem' }}>
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              ))}
            </div>

            {/* Quote text */}
            <p style={{
              color: 'var(--text-primary)', fontSize: '1.075rem', lineHeight: 1.75,
              marginBottom: '1.75rem', fontStyle: 'italic', position: 'relative', zIndex: 1,
            }}>
              "{t.quote}"
            </p>

            {/* Member + earnings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: t.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.location} · {t.plan}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--green)' }}>{t.earned}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Earned</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.75rem' }}>
            <button
              onClick={prev}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--border-cyan)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    height: 8, width: i === idx ? 28 : 8, borderRadius: 100,
                    background: i === idx ? 'var(--cyan)' : 'var(--border-light)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0,
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--border-cyan)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
