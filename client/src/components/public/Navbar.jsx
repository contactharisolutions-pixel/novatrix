import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, TrendingUp, ChevronRight } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home',         href: '/#home' },
  { label: 'About',        href: '/#about' },
  { label: 'Services',     href: '/#services' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Plans',        href: '/#plans' },
  { label: 'FAQ',          href: '/#faq' },
  { label: 'Contact',      href: '/#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  const handleAnchor = (e, href) => {
    if (href.startsWith('/#')) {
      e.preventDefault()
      const id = href.replace('/#', '')
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.875rem',
            paddingBottom: '0.875rem',
          }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                <img src="/logo.svg" alt="Novatrix Logo" style={{ height: 42 }} />
            </Link>

            {/* Desktop nav links */}
            <ul style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.25rem',
              listStyle: 'none',
            }} className="md-flex-hidden" id="nav-desktop-links">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={(e) => handleAnchor(e, href)}
                    style={{
                      display: 'block',
                      padding: '0.45rem 0.875rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      borderRadius: 8,
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => { e.target.style.color = 'var(--cyan)'; e.target.style.background = 'rgba(0,212,255,0.06)' }}
                    onMouseLeave={e => { e.target.style.color = 'var(--text-secondary)'; e.target.style.background = 'transparent' }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* CTA buttons — desktop */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/login"
                className="btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', display: 'none' }}
                id="nav-login-btn"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', display: 'none', gap: '0.4rem' }}
                id="nav-register-btn"
              >
                Get Started <ChevronRight size={14} />
              </Link>

              {/* Hamburger */}
              <button
                className="menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Inline CSS for responsive show/hide */}
      <style>{`
        @media (min-width: 768px) {
          #nav-desktop-links { display: flex !important; }
          #nav-login-btn { display: inline-flex !important; }
          #nav-register-btn { display: inline-flex !important; }
          .menu-toggle { display: none !important; }
        }
      `}</style>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 90,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`mobile-menu ${menuOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 300,
          background: 'var(--navy-light)',
          borderLeft: '1px solid var(--border)',
          zIndex: 95,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          gap: '0.5rem',
        }}
      >
        {/* Drawer header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setMenuOpen(false)}>
            <img src="/logo.svg" alt="Novatrix" style={{ height: 32 }} />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.4rem', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={(e) => { handleAnchor(e, href); setMenuOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.875rem',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'all 0.2s',
                marginBottom: '0.25rem',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; e.currentTarget.style.color = 'var(--cyan)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {label}
              <ChevronRight size={14} />
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <Link to="/login" className="btn-secondary" style={{ width: '100%' }} onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/register" className="btn-primary" style={{ width: '100%' }} onClick={() => setMenuOpen(false)}>
            Get Started <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </>
  )
}
