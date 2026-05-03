import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Users, DollarSign, Cpu, Activity, TrendingUp, Download,
} from 'lucide-react'

const STATS = [
  { icon: Users,      value: '50,000+', label: 'Active Traders'  },
  { icon: DollarSign, value: '$12M+',   label: 'Capital Managed' },
  { icon: Cpu,        value: '99.9%',   label: 'AI Accuracy'     },
  { icon: Activity,   value: '24/7',    label: 'Market Uptime'   },
]

/* ---------- Neural Canvas (adaptive node count) ---------- */
function AICanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Fewer nodes on mobile — keeps frame-time low
    const isMobile = window.innerWidth < 768
    const nodeCount = isMobile ? 50 : 120
    const connDist  = isMobile ? 100 : 150

    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 0.5,
      type: Math.random() > 0.8 ? 'core' : 'node',
      pulse: Math.random() * Math.PI * 2,
    }))

    const streams = Array.from({ length: isMobile ? 6 : 15 }, () => ({
      x: Math.random() * canvas.width,
      speed: Math.random() * 1.5 + 0.5,
      y: Math.random() * -1000,
      length: Math.random() * 150 + 50,
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Data streams
      ctx.lineWidth = 1.5
      streams.forEach(s => {
        const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.length)
        grad.addColorStop(0, 'rgba(0,212,255,0)')
        grad.addColorStop(1, 'rgba(0,212,255,0.12)')
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x, s.y + s.length)
        ctx.stroke()
        s.y += s.speed
        if (s.y > canvas.height) { s.y = -s.length; s.x = Math.random() * canvas.width }
      })

      // Nodes
      nodes.forEach((node, i) => {
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.04
        if (node.x < 0 || node.x > canvas.width)  node.vx *= -1
        if (node.y < 0 || node.y > canvas.height)  node.vy *= -1

        for (let j = i + 1; j < nodes.length; j++) {
          const dx = node.x - nodes[j].x
          const dy = node.y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connDist) {
            ctx.beginPath()
            const op = (1 - dist / connDist) * 0.12
            ctx.strokeStyle = node.type === 'core' || nodes[j].type === 'core'
              ? `rgba(0,212,255,${op})`
              : `rgba(124,58,237,${op})`
            ctx.lineWidth = 0.5
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        if (node.type === 'core') {
          const glow = Math.sin(node.pulse) * 0.5 + 0.5
          ctx.fillStyle = `rgba(0,212,255,${glow})`
          ctx.shadowBlur = 12
          ctx.shadowColor = 'rgba(0,212,255,0.8)'
        } else {
          ctx.fillStyle = 'rgba(124,58,237,0.4)'
          ctx.shadowBlur = 0
        }
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        willChange: 'transform', // promote to compositor layer
      }}
    />
  )
}

/* ---------- Candle chart (right panel) ---------- */
function FakeCandleChart() {
  const candles = useRef(
    Array.from({ length: 36 }, () => ({
      height: Math.random() * 60 + 10,
      top: Math.random() * 35,
      isUp: Math.random() > 0.4,
      dur: (Math.random() * 2 + 2).toFixed(1),
    }))
  )
  return (
    <div className="candle-chart-bg">
      {candles.current.map((c, i) => (
        <div key={i} style={{ position: 'relative', width: 6, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 1, height: '100%', background: c.isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', position: 'absolute' }} />
          <div style={{
            width: '100%', height: `${c.height}%`,
            background: c.isUp ? 'var(--green)' : 'var(--red)',
            position: 'absolute', top: `${c.top}%`,
            borderRadius: 2, opacity: 0.8,
            boxShadow: c.isUp ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(239,68,68,0.4)',
            animation: `float-candle ${c.dur}s ease-in-out infinite alternate`,
          }} />
        </div>
      ))}
    </div>
  )
}

/* ---------- Main export ---------- */
export default function HeroSection() {
  const [isSmall, setIsSmall] = useState(window.innerWidth < 768)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsSmall(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const scrollToPlans = () =>
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="home" className="hero-section">
      {/* Backgrounds */}
      <AICanvas />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(6,11,23,0.35) 0%, var(--navy) 100%)', zIndex: 1 }} />
      <div className="glow-orb" style={{ top: '15%', left: '5%', background: 'var(--cyan)' }} />
      <div className="glow-orb" style={{ bottom: '5%', right: '5%', background: 'var(--purple)' }} />
      <div className="hero-grid-bg" aria-hidden="true" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-grid">

          {/* ── Left: content ── */}
          <div className="hero-content">

            {/* Status badge */}
            <div className="hero-badge slide-in-left">
              <span className="hero-badge-dot" />
              <span>Novatrix AI System v2.0&nbsp;Online</span>
            </div>

            {/* Headline */}
            <h1 className="hero-title slide-in-up">
              The Future of <br />
              <span>Algorithmic Trading</span>
            </h1>

            {/* Subtitle */}
            <p className="fade-in delay-1 hero-subtitle">
              Harness the power of autonomous AI robotics to navigate Crypto and Forex markets.
              Zero emotion, 100% precision. Institutional-grade quantitative strategies now
              available to everyone.
            </p>

            {/* CTAs */}
            <div className="fade-in delay-2 hero-ctas">
              <Link to="/register" className="btn-primary hero-cta-primary">
                Deploy Capital <ArrowRight size={18} />
              </Link>
              <button onClick={scrollToPlans} className="btn-secondary hero-cta-secondary">
                <Activity size={18} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                Live Performance
              </button>
              <a
                href="https://fuvivhukudqjjpzmqusg.supabase.co/storage/v1/object/public/novatrix/Novatrix%20Presentation.pdf"
                download="Novatrix_Business_Plan.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary hero-cta-secondary"
              >
                <Download size={18} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                Business Plan
              </a>
            </div>

            {/* Stats */}
            <div className="fade-in delay-3 hero-stats">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="hero-stat-item">
                  <Icon size={18} style={{ color: 'var(--cyan)' }} />
                  <span className="hero-stat-value">{value}</span>
                  <span className="hero-stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: visualizer (hidden on small mobile) ── */}
          {!isSmall && (
            <div className="hero-visualizer fade-in delay-2">
              <div className="hero-vis-glow" />

              {/* Glass panel */}
              <div className="hero-vis-panel">
                {/* Header */}
                <div className="hero-vis-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Cpu size={22} style={{ color: 'var(--cyan)' }} />
                    <div>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff', marginBottom: '0.15rem' }}>Neural Engine Active</h3>
                      <p style={{ fontSize: '0.7rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                        Scanning Markets
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>+12.4%</p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)' }}>24h Net Yield</p>
                  </div>
                </div>

                {/* Chart */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <FakeCandleChart />
                </div>

                {/* Fade overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(10,15,30,1), transparent)', pointerEvents: 'none' }} />

                {/* Floating metrics */}
                <div className="hero-vis-metrics">
                  <div className="hero-vis-metric">
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BTC/USD</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>64,230.50</p>
                  </div>
                  <div className="hero-vis-metric">
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Confidence</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>98.2% BUY</p>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="float-obj-1">
                <TrendingUp size={22} style={{ color: 'var(--purple)' }} />
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        /* ── Glow orbs ── */
        .glow-orb {
          position: absolute;
          width: min(600px, 80vw);
          height: min(600px, 80vw);
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
          will-change: transform;
        }

        /* ── Grid background ── */
        .hero-grid-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
          opacity: 0.25;
          pointer-events: none;
        }

        /* ── Status badge ── */
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 100px;
          padding: 0.4rem 1rem;
          margin-bottom: 1.75rem;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--cyan);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          flex-wrap: nowrap;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hero-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 8px var(--cyan);
          animation: pulse 1.5s infinite;
          flex-shrink: 0;
        }

        /* ── CTA buttons ── */
        .hero-cta-primary {
          padding: 0.9rem 2rem;
          font-size: 1rem;
          min-height: 52px;
          box-shadow: 0 0 20px rgba(0,212,255,0.25);
          flex: 1 1 auto;
          justify-content: center;
        }
        .hero-cta-secondary {
          padding: 0.9rem 2rem;
          font-size: 1rem;
          min-height: 52px;
          background: rgba(255,255,255,0.04);
          flex: 1 1 auto;
          justify-content: center;
        }

        /* ── Stats ── */
        .hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }
        .hero-stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .hero-stat-value {
          font-size: 1.375rem;
          font-weight: 900;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          line-height: 1;
        }
        .hero-stat-label {
          font-size: 0.7rem;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        /* ── Visualizer panel ── */
        .hero-visualizer {
          position: relative;
          height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-vis-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(45deg, rgba(0,212,255,0.05), rgba(124,58,237,0.05));
          border-radius: 50%;
          filter: blur(60px);
        }
        .hero-vis-panel {
          position: relative;
          width: 100%;
          height: 460px;
          background: rgba(10,15,30,0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 24px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,212,255,0.04);
        }
        .hero-vis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .hero-vis-metrics {
          position: absolute;
          bottom: 1.25rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          z-index: 2;
        }
        .hero-vis-metric {
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* ── Float element ── */
        .float-obj-1 {
          position: absolute;
          top: 40px;
          right: -16px;
          background: rgba(124,58,237,0.12);
          border: 1px solid var(--purple);
          padding: 0.875rem;
          border-radius: 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: float 6s ease-in-out infinite;
        }

        /* ── Candle chart ── */
        .candle-chart-bg {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          height: 100%;
          width: 100%;
          padding-bottom: 1.5rem;
        }

        /* ── Keyframes ── */
        @keyframes float-candle {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-8%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-18px); }
        }

        /* ── Tablet breakpoint (< 1024px) ── */
        @media (max-width: 1024px) {
          .hero-stats { gap: 1rem; }
          .hero-visualizer { height: 420px; }
          .hero-vis-panel  { height: 400px; }
        }

        /* ── Small tablet / large phone (< 768px) ── */
        @media (max-width: 767px) {
          .hero-badge { font-size: 0.6875rem; padding: 0.35rem 0.875rem; margin-bottom: 1.25rem; }
          .hero-stats { grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
          .hero-stat-value { font-size: 1.2rem; }
          .hero-cta-primary, .hero-cta-secondary { padding: 0.8rem 1.5rem; font-size: 0.9375rem; }
          .hero-grid-bg { display: none; } /* hide heavy perspective bg on mobile */
        }

        /* ── Phone (< 480px) ── */
        @media (max-width: 480px) {
          .hero-badge { font-size: 0.625rem; padding: 0.3rem 0.75rem; }
          .hero-stats { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .hero-stat-value { font-size: 1.1rem; }
          .hero-stat-label { font-size: 0.625rem; }
          .hero-ctas { max-width: 100%; }
          .hero-cta-primary, .hero-cta-secondary { min-height: 48px; }
        }
      `}</style>
    </section>
  )
}
