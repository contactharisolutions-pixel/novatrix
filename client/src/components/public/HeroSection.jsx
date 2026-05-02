import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Play, Users, DollarSign, Globe, BarChart2, Zap, Cpu, Activity, TrendingUp, Download } from 'lucide-react'

const STATS = [
  { icon: Users,      value: '50,000+',  label: 'Active Traders'  },
  { icon: DollarSign, value: '$12M+',    label: 'Capital Managed' },
  { icon: Cpu,        value: '99.9%',    label: 'AI Accuracy'     },
  { icon: Activity,   value: '24/7',     label: 'Market Uptime'   },
]

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
    window.addEventListener('resize', resize, { passive: true })

    // AI Neural Nodes
    const nodes = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 0.5,
      type: Math.random() > 0.8 ? 'core' : 'node',
      pulse: Math.random() * Math.PI * 2
    }))

    // Data streams
    const streams = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      speed: Math.random() * 2 + 1,
      y: Math.random() * -1000,
      length: Math.random() * 200 + 50
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw Data Streams (Matrix-like)
      ctx.lineWidth = 1.5
      streams.forEach(stream => {
        const gradient = ctx.createLinearGradient(stream.x, stream.y, stream.x, stream.y + stream.length)
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0)')
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.15)')
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(stream.x, stream.y)
        ctx.lineTo(stream.x, stream.y + stream.length)
        ctx.stroke()
        
        stream.y += stream.speed
        if (stream.y > canvas.height) {
          stream.y = -stream.length
          stream.x = Math.random() * canvas.width
        }
      })

      // Draw Neural Nodes and Connections
      nodes.forEach((node, i) => {
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.05

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Connections
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = node.x - nodes[j].x
          const dy = node.y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150) {
            ctx.beginPath()
            const opacity = (1 - dist / 150) * 0.15
            ctx.strokeStyle = node.type === 'core' || nodes[j].type === 'core' 
              ? `rgba(0, 212, 255, ${opacity})` 
              : `rgba(124, 58, 237, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }

        // Draw Node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        if (node.type === 'core') {
          const glow = Math.sin(node.pulse) * 0.5 + 0.5
          ctx.fillStyle = `rgba(0, 212, 255, ${glow})`
          ctx.shadowBlur = 15
          ctx.shadowColor = 'rgba(0, 212, 255, 0.8)'
        } else {
          ctx.fillStyle = 'rgba(124, 58, 237, 0.5)'
          ctx.shadowBlur = 0
        }
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas ref={canvasRef} id="ai-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
  )
}

function FakeCandleChart() {
  return (
    <div className="candle-chart-bg">
      {Array.from({ length: 40 }).map((_, i) => {
        const height = Math.random() * 60 + 10;
        const top = Math.random() * 40;
        const isUp = Math.random() > 0.4;
        return (
          <div key={i} style={{
            position: 'relative', width: 6, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: 1, height: '100%', background: isUp ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', position: 'absolute' }} />
            <div style={{ 
              width: '100%', height: `${height}%`, background: isUp ? 'var(--green)' : 'var(--red)', 
              position: 'absolute', top: `${top}%`, borderRadius: 2, opacity: 0.8,
              boxShadow: isUp ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(239,68,68,0.5)',
              animation: `float-candle ${Math.random() * 2 + 2}s ease-in-out infinite alternate`
            }} />
          </div>
        )
      })}
    </div>
  )
}

export default function HeroSection() {
  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="home" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: '6rem', paddingBottom: '4rem', width: '100%' }}>
      {/* Dynamic Backgrounds */}
      <AICanvas />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(6,11,23,0.4) 0%, var(--navy) 100%)', zIndex: 1 }} />
      <div className="glow-orb" style={{ top: '20%', left: '10%', background: 'var(--cyan)' }} />
      <div className="glow-orb" style={{ bottom: '10%', right: '10%', background: 'var(--purple)' }} />

      {/* Abstract Grid */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '50px 50px', transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)', opacity: 0.3 }} />

      <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1400, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="hero-grid">
          
          {/* Left Content */}
          <div style={{ paddingRight: '2rem' }} className="hero-content">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 100, padding: '0.5rem 1.25rem', marginBottom: '2rem', backdropFilter: 'blur(10px)' }} className="slide-in-left">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 10px #00d4ff', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Novatrix AI System v2.0 Online</span>
            </div>

            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1, marginBottom: '1.5rem', color: '#fff', letterSpacing: '-0.02em' }} className="slide-in-up">
              The Future of <br />
              <span style={{ background: 'linear-gradient(135deg, var(--cyan), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', position: 'relative' }}>
                Algorithmic Trading
                <div style={{ position: 'absolute', bottom: 5, left: 0, width: '100%', height: 8, background: 'var(--cyan)', opacity: 0.2, filter: 'blur(4px)' }} />
              </span>
            </h1>

            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2.5rem', maxWidth: 540 }} className="fade-in delay-1">
              Harness the power of autonomous AI robotics to navigate Crypto and Forex markets. Zero emotion, 100% precision. Institutional-grade quantitative strategies now available to everyone.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '3rem', justifyContent: 'flex-start' }} className="fade-in delay-2 hero-ctas">
              <Link to="/register" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem', height: 56, boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                Deploy Capital <ArrowRight size={20} />
              </Link>
              <button onClick={scrollToPlans} className="btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem', height: 56, display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                <Activity size={20} style={{ color: 'var(--cyan)' }} /> Live Performance
              </button>
              <a href="https://fuvivhukudqjjpzmqusg.supabase.co/storage/v1/object/public/novatrix/Novatrix%20Presentation.pdf" download="Novatrix_Business_Plan.pdf" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem', height: 56, display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', textDecoration: 'none' }}>
                <Download size={20} style={{ color: 'var(--purple)' }} /> Business Plan
              </a>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }} className="fade-in delay-3 stat-row">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Icon size={20} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>{value}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visualizer */}
          <div className="hero-visualizer fade-in delay-2" style={{ position: 'relative', height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(0,212,255,0.05), rgba(124,58,237,0.05))', borderRadius: '50%', filter: 'blur(60px)' }} />
            
            {/* Main Glass Panel */}
            <div style={{ 
              position: 'relative', width: '100%', height: 480, background: 'rgba(10, 15, 30, 0.6)', 
              backdropFilter: 'blur(20px)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 24, 
              padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,212,255,0.05)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Cpu size={24} style={{ color: 'var(--cyan)' }} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Neural Engine Active</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} /> Scanning Markets
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>+12.4%</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>24h Net Yield</p>
                </div>
              </div>

              {/* Chart Area */}
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '4px', overflow: 'hidden' }}>
                <FakeCandleChart />
              </div>

              {/* Data streams overlay */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(10,15,30,1), transparent)', pointerEvents: 'none' }} />
              
              {/* Floating metrics */}
              <div style={{ position: 'absolute', bottom: '1.5rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                 <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>BTC/USD</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono' }}>64,230.50</p>
                 </div>
                 <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>AI Confidence</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>98.2% BUY</p>
                 </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="float-obj-1" style={{ position: 'absolute', top: 40, right: -20, background: 'rgba(124,58,237,0.1)', border: '1px solid var(--purple)', padding: '1rem', borderRadius: 16, backdropFilter: 'blur(10px)' }}>
              <TrendingUp size={24} style={{ color: 'var(--purple)' }} />
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .glow-orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          pointer-events: none;
        }
        .candle-chart-bg {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 100%;
          width: 100%;
          padding-bottom: 2rem;
        }
        @keyframes float-candle {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10%); }
        }
        .float-obj-1 { animation: float 6s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hero-content { padding-right: 0 !important; text-align: center; display: flex; flex-direction: column; align-items: center; }
          .hero-content p { margin: 0 auto 2.5rem auto !important; }
          .hero-ctas { justify-content: center !important; }
          .stat-row { justify-content: center; text-align: center; }
          .hero-visualizer { height: 400px !important; }
        }
        @media (max-width: 640px) {
          .stat-row { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
        }
      `}</style>
    </section>
  )
}
