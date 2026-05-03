import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronRight } from 'lucide-react'

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
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]   = useState(false)
  const [isDesktop, setIsDesktop]  = useState(window.innerWidth >= 768)
  const location = useLocation()

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location])

  // Breakpoint detection
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => {
      setIsDesktop(e.matches)
      if (e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleAnchor = useCallback((e, href) => {
    if (href.startsWith('/#')) {
      e.preventDefault()
      setMenuOpen(false)
      const id = href.replace('/#', '')
      // Small delay so drawer close animation completes first
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }
  }, [])

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className="navbar-inner">
            {/* Logo */}
            <Link to="/" className="navbar-logo" aria-label="Novatrix home">
              <img src="/logo.svg" alt="Novatrix" height={40} width="auto" loading="eager" />
            </Link>

            {/* Desktop links */}
            {isDesktop && (
              <ul className="navbar-links" role="list">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="navbar-link"
                      onClick={(e) => handleAnchor(e, href)}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Right section */}
            <div className="navbar-actions">
              {isDesktop && (
                <>
                  <Link to="/login"    className="btn-secondary navbar-btn">Login</Link>
                  <Link to="/register" className="btn-primary  navbar-btn">
                    Get Started <ChevronRight size={14} />
                  </Link>
                </>
              )}

              {/* Hamburger */}
              {!isDesktop && (
                <button
                  className="hamburger"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-drawer"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer backdrop ── */}
      {menuOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        id="mobile-drawer"
        className={`mobile-drawer ${menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="drawer-header">
          <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Novatrix home">
            <img src="/logo.svg" alt="Novatrix" height={32} />
          </Link>
          <button
            className="hamburger"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="drawer-nav" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="drawer-link"
              onClick={(e) => handleAnchor(e, href)}
            >
              <span>{label}</span>
              <ChevronRight size={14} />
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="drawer-ctas">
          <Link to="/login"    className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/register" className="btn-primary"   style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
            Get Started <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <style>{`
        /* ── Navbar inner layout ── */
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.8rem;
          padding-bottom: 0.8rem;
          gap: 1rem;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
        }
        .navbar-logo img { height: 40px; width: auto; }

        /* Desktop nav links */
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          list-style: none;
          flex: 1;
          justify-content: center;
        }
        .navbar-link {
          display: block;
          padding: 0.4rem 0.875rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 8px;
          transition: all 0.2s;
          text-decoration: none;
          white-space: nowrap;
        }
        .navbar-link:hover {
          color: var(--cyan);
          background: rgba(0,212,255,0.06);
        }

        /* Desktop action buttons */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-shrink: 0;
        }
        .navbar-btn {
          padding: 0.45rem 1.1rem;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        /* Hamburger button */
        .hamburger {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          /* Large touch target */
          min-width: 40px;
          min-height: 40px;
        }
        .hamburger:hover {
          color: #fff;
          border-color: var(--border-light);
          background: rgba(255,255,255,0.08);
        }

        /* ── Backdrop ── */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 90;
          animation: fadeIn 0.2s ease;
        }

        /* ── Mobile drawer ── */
        .mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          /* Clamp width: 85vw but no wider than 320px */
          width: min(320px, 85vw);
          background: var(--navy-light);
          border-left: 1px solid var(--border);
          z-index: 95;
          display: flex;
          flex-direction: column;
          padding: 1.25rem;
          gap: 0.375rem;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          /* Account for iOS safe area */
          padding-right: max(1.25rem, env(safe-area-inset-right));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-drawer.open { transform: translateX(0); }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-shrink: 0;
        }
        .drawer-nav {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .drawer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0.75rem;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.18s;
          margin-bottom: 0.2rem;
        }
        .drawer-link:hover,
        .drawer-link:focus-visible {
          background: rgba(0,212,255,0.07);
          color: var(--cyan);
        }
        .drawer-ctas {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          /* Safe area bottom */
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  )
}
