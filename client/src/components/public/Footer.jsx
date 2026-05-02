import { Link } from 'react-router-dom'
import { TrendingUp, Send, MessageCircle, AtSign, PlayCircle, Mail, Clock, ExternalLink } from 'lucide-react'

const QUICK_LINKS = [
  { label: 'Home',         id: 'home' },
  { label: 'About Us',     id: 'about' },
  { label: 'Services',     id: 'services' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Plans',        id: 'plans' },
  { label: 'FAQ',          id: 'faq' },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy',   to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Risk Disclaimer',  to: '/disclaimer' },
]

const SOCIALS = [
  { icon: Send,          href: 'https://t.me/novatrix_official', label: 'Telegram', color: '#26a5e4' },
  { icon: AtSign,        href: '#', label: 'X / Twitter', color: '#94a3b8' },
  { icon: MessageCircle, href: '#', label: 'Instagram',   color: '#e1306c' },
  { icon: PlayCircle,    href: '#', label: 'YouTube',     color: '#ff0000' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer style={{ background: 'var(--navy-light)', borderTop: '1px solid var(--border)' }} id="contact">
      {/* Main footer */}
      <div className="container" style={{ paddingTop: '4.5rem', paddingBottom: '3.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: '3rem',
        }} id="footer-grid">
          {/* Brand col */}
          <div style={{ gridColumn: '1 / -1' }} id="footer-brand">
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0,212,255,0.3)',
              }}>
                <TrendingUp size={18} color="#fff" />
              </div>
              <span style={{
                fontSize: '1.375rem',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Novatrix</span>
            </Link>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.75,
              marginBottom: '1.5rem',
              maxWidth: 340,
            }}>
              Smart Crypto &amp; Forex trading platform. Grow your capital through intelligent
              market strategies and disciplined fund management trusted by 50,000+ investors worldwide.
            </p>
            {/* Socials */}
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              {SOCIALS.map(({ icon: Icon, href, label, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  style={{
                    width: 38, height: 38,
                    borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.25s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = color
                    e.currentTarget.style.borderColor = color
                    e.currentTarget.style.background = `${color}18`
                    e.currentTarget.style.transform = 'translateY(-3px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div id="footer-links">
            <h4 style={{
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
              marginBottom: '1.125rem', letterSpacing: '0.02em',
            }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {QUICK_LINKS.map(({ label, id }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '0.875rem',
                      textAlign: 'left', padding: 0, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <span style={{ color: 'var(--cyan)', fontSize: '0.6rem' }}>▶</span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div id="footer-legal">
            <h4 style={{
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
              marginBottom: '1.125rem', letterSpacing: '0.02em',
            }}>Legal</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {LEGAL_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    style={{
                      color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <span style={{ color: 'var(--cyan)', fontSize: '0.6rem' }}>▶</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div id="footer-contact">
            <h4 style={{
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
              marginBottom: '1.125rem', letterSpacing: '0.02em',
            }}>Get In Touch</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li>
                <a
                  href="mailto:support@novatrix.vip"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: 'rgba(0,212,255,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Mail size={13} color="var(--cyan)" />
                  </div>
                  support@novatrix.vip
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/novatrix_official"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: 'rgba(0,212,255,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Send size={13} color="var(--cyan)" />
                  </div>
                  @novatrix_official
                </a>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: 'rgba(0,212,255,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Clock size={13} color="var(--cyan)" />
                </div>
                Support: 24/7 Available
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
            alignItems: 'center', gap: '0.75rem',
          }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>
              © {year} <span style={{ color: 'var(--text-secondary)' }}>Novatrix.vip</span> — All Rights Reserved.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'right' }}>
              ⚠️ Trading involves risk. Past performance ≠ future results.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive grid CSS */}
      <style>{`
        @media (min-width: 640px) {
          #footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #footer-brand {
            grid-column: 1 / -1 !important;
          }
        }
        @media (min-width: 1024px) {
          #footer-grid {
            grid-template-columns: 2fr 1fr 1fr 1.5fr !important;
          }
          #footer-brand {
            grid-column: auto !important;
          }
        }
      `}</style>
    </footer>
  )
}
