import { useEffect, useRef } from 'react'
import { Activity, Globe2, TrendingUp } from 'lucide-react'

function TradingViewTicker() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return
    // Prevent duplicate script injection
    if (container.current.querySelector('script')) return

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = `
      {
        "symbols": [
          { "proName": "FOREXCOM:SPXUSD", "title": "S&P 500 Index" },
          { "proName": "FOREXCOM:NSXUSD", "title": "US 100 Cash CFD" },
          { "proName": "FX_IDC:EURUSD", "title": "EUR to USD" },
          { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
          { "proName": "BITSTAMP:ETHUSD", "title": "Ethereum" },
          { "description": "Solana", "proName": "BINANCE:SOLUSDT" },
          { "description": "Gold", "proName": "OANDA:XAUUSD" }
        ],
        "showSymbolLogo": true,
        "isTransparent": true,
        "displayMode": "adaptive",
        "colorTheme": "dark",
        "locale": "en"
      }
    `
    container.current.appendChild(script)
  }, [])

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: 46, borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,11,23,0.8)', backdropFilter: 'blur(10px)' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}

function TradingViewChart() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return
    if (container.current.querySelector('script')) return

    // Responsive height based on viewport
    const chartHeight = window.innerWidth < 640 ? 360 : window.innerWidth < 1024 ? 480 : 600

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = `
      {
        "width": "100%",
        "height": "${chartHeight}",
        "symbol": "BINANCE:BTCUSDT",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(10, 15, 30, 1)",
        "gridColor": "rgba(255, 255, 255, 0.06)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_cf808",
        "studies": [
          "Volume@tv-basicstudies",
          "MACD@tv-basicstudies",
          "RSI@tv-basicstudies"
        ]
      }
    `
    container.current.appendChild(script)
  }, [])

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', touchAction: 'pan-y' }}>
      <div className="tradingview-widget-container__widget" style={{ height: 'calc(100% - 32px)', width: '100%' }}></div>
    </div>
  )
}

export default function LiveMarketSection() {
  return (
    <section id="markets" style={{ position: 'relative', background: 'var(--navy)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      {/* Ticker Tape */}
      <TradingViewTicker />

      <div className="container" style={{ position: 'relative', zIndex: 10, marginTop: '3rem', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 100, padding: '0.5rem 1.25rem', marginBottom: '1.5rem' }}>
            <Activity size={16} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--purple)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Market Live</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3.5rem)', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            BTC/USD Real-time Analysis
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
            Our AI engine constantly monitors the global financial markets. Access institutional-grade charting and volume metrics directly from your dashboard.
          </p>
        </div>

        {/* Chart Container */}
        <div className="fade-in delay-2" style={{ 
          background: 'rgba(10, 15, 30, 0.8)', 
          border: '1px solid var(--border)', 
          borderRadius: 24, 
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative',
          /* allow horizontal touch inside chart on mobile */
          touchAction: 'pan-y',
        }}>
          {/* Top Bar */}
          <div style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
               <Globe2 size={18} style={{ color: 'var(--cyan)' }} />
               <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Novatrix Terminal</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
               <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--red)' }} />
               <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--orange)' }} />
               <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--green)' }} />
            </div>
          </div>
          
          <TradingViewChart />
        </div>
      </div>
    </section>
  )
}
