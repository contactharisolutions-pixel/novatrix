import { useEffect, useRef, useState, useCallback } from 'react'
import {
  TrendingUp, Wallet, DollarSign, ArrowRight,
  ShieldCheck, Loader2, Info, Activity, AlertTriangle, RefreshCw,
  Bitcoin, Copy, Check, X, ExternalLink, Clock, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import QRCodeLib from 'qrcode'
import api from '../../lib/api'
import useAuthStore from '../../store/useAuthStore'
import { PageHeader, Spinner, Panel, DataTable, Badge } from '../../components/member/ui'

// ─── Currency metadata ────────────────────────────────────────
const CURRENCY_META = {
  usdttrc20:  { label: 'USDT (TRC-20)',  icon: '💵', color: '#26A17B' },
  usdterc20:  { label: 'USDT (ERC-20)',  icon: '💵', color: '#26A17B' },
  usdtbsc:    { label: 'USDT (BEP-20)', icon: '💵', color: '#26A17B' },
  usdtsol:    { label: 'USDT (SOL)',     icon: '💵', color: '#26A17B' },
  btc:        { label: 'Bitcoin (BTC)',  icon: '🟠', color: '#F7931A' },
  eth:        { label: 'Ethereum (ETH)', icon: '🔵', color: '#627EEA' },
  bnbbsc:     { label: 'BNB (BEP-20)',   icon: '🟡', color: '#F3BA2F' },
  trx:        { label: 'TRON (TRX)',     icon: '🔴', color: '#EF0027' },
  sol:        { label: 'Solana (SOL)',   icon: '🟣', color: '#9945FF' },
  ltc:        { label: 'Litecoin (LTC)', icon: '⚫', color: '#BFBBBB' },
  xrp:        { label: 'XRP',            icon: '🔷', color: '#00AAE4' },
}

// ─── QR Code via Client-Side Canvas ───────────────────────────
function QRCode({ value, size = 180 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Error generating QR code:', err)
      })
    }
  }, [value, size])

  if (!value) return null
  return (
    <div style={{ background: '#fff', padding: 8, borderRadius: 10, display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: size, height: size }} />
    </div>
  )
}


// ─── Payment Status Indicator ─────────────────────────────────
function StatusDot({ status }) {
  const map = {
    waiting:    { color: '#f59e0b', label: 'Waiting for payment...' },
    confirming: { color: '#3b82f6', label: 'Confirming on blockchain...' },
    confirmed:  { color: '#10b981', label: 'Confirmed! Activating...' },
    sending:    { color: '#7c3aed', label: 'Processing payment...' },
    finished:   { color: '#10b981', label: '✅ Payment Complete!' },
    failed:     { color: '#ef4444', label: 'Payment Failed' },
    expired:    { color: '#64748b', label: 'Payment Expired' },
    partially_paid: { color: '#f59e0b', label: 'Partially paid — awaiting full amount' },
  }
  const s = map[status] || { color: '#94a3b8', label: status }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%', background: s.color,
        boxShadow: `0 0 8px ${s.color}`,
        animation: ['waiting', 'confirming', 'sending'].includes(status) ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
    </div>
  )
}

// ─── Copy Button ──────────────────────────────────────────────
function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} title="Copy" style={{
      background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
      borderRadius: 8, padding: '0.4rem 0.7rem', cursor: 'pointer', transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', gap: '0.35rem', color: copied ? '#10b981' : 'var(--text-muted)',
      fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
    }}>
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

// ─── NOWPayments Modal ────────────────────────────────────────
function CryptoPaymentModal({ payment, onClose, onSuccess }) {
  const [status, setStatus]     = useState(payment.payment_status || 'waiting')
  const [activated, setActivated] = useState(false)
  const intervalRef             = useRef(null)

  const pollStatus = useCallback(async () => {
    try {
      const { data } = await api.get(`/nowpayments/payment-status/${payment.payment_id}`)
      setStatus(data.payment_status)

      if (data.payment_status === 'finished') {
        clearInterval(intervalRef.current)
        if (!activated) {
          setActivated(true)
          if (data.activated || data.already_activated) {
            onSuccess()
          }
        }
      }
      if (['failed', 'expired'].includes(data.payment_status)) {
        clearInterval(intervalRef.current)
      }
    } catch (err) {
      console.error('Poll error:', err)
    }
  }, [payment.payment_id, activated, onSuccess])

  useEffect(() => {
    intervalRef.current = setInterval(pollStatus, 8000)  // poll every 8s
    return () => clearInterval(intervalRef.current)
  }, [pollStatus])

  const currency = CURRENCY_META[payment.pay_currency?.toLowerCase()] || { label: payment.pay_currency?.toUpperCase(), icon: '💰', color: '#94a3b8' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0f1827 0%, #131c2e 100%)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 20,
        padding: '2rem',
        width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 25px 50px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0.35rem', cursor: 'pointer', display: 'flex', color: 'var(--text-faint)',
        }}>
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1,
            filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.4))',
          }}>{currency.icon}</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Send {currency.label}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Your package activates automatically once payment confirms
          </p>
        </div>

        {/* Status */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <StatusDot status={status} />
          {status === 'finished' && (
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Package Activated! 🎉</span>
          )}
        </div>

        {/* Amount to send */}
        <div style={{
          background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: 12, padding: '1rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount to Pay</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--cyan)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
              {payment.pay_amount} <span style={{ fontSize: '1rem' }}>{payment.pay_currency?.toUpperCase()}</span>
            </p>
          </div>
          <CopyBtn value={payment.pay_amount?.toString()} />
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <QRCode value={payment.pay_address} size={180} />
        </div>

        {/* Wallet Address */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Payment Address
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '0.75rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
          }}>
            <span style={{
              fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-primary)',
              wordBreak: 'break-all', flex: 1,
            }}>{payment.pay_address}</span>
            <CopyBtn value={payment.pay_address} />
          </div>
        </div>

        {/* Warnings */}
        <div style={{
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10, padding: '0.875rem', display: 'flex', gap: '0.75rem',
        }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', lineHeight: 1.7 }}>
            <p><strong>Send exactly the amount shown</strong> — under/overpayment may delay processing.</p>
            <p style={{ marginTop: '0.25rem' }}>Only send <strong>{currency.label}</strong> to this address. Sending another coin will result in permanent loss.</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-faint)', fontSize: '0.75rem' }}>
          <Clock size={12} />
          <span>Page auto-refreshes every 8 seconds • Payment ID: {payment.payment_id}</span>
        </div>

        {/* DEV ONLY: Simulate successful payment for local testing */}
        {import.meta.env.DEV && (
          <button
            onClick={async () => {
              try {
                const { default: api } = await import('../../lib/api')
                const { data } = await api.post('/nowpayments/simulate-payment', { deposit_id: payment.deposit_id })
                if (data.activated) onSuccess()
              } catch (err) {
                alert('Simulation error: ' + (err?.response?.data?.error || err.message))
              }
            }}
            style={{
              marginTop: '0.875rem', width: '100%', padding: '0.625rem',
              background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.3)',
              borderRadius: 10, cursor: 'pointer', color: '#10b981',
              fontSize: '0.75rem', fontWeight: 700, textAlign: 'center',
            }}
          >
            🧪 [DEV] Simulate Successful Payment
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

// ─── Trade Page ───────────────────────────────────────────────
export default function TradePage() {
  const { user }                    = useAuthStore()
  const [wallets, setWallets]       = useState({ fund_wallet: 0, income_wallet: 0 })
  const [packages, setPackages]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount]         = useState('20')
  const [source, setSource]         = useState('fund_wallet')  // 'fund_wallet' | 'income_wallet' | 'crypto'
  const [pin, setPin]               = useState('')

  // Crypto payment — locked to USDT BEP-20 only
  const payCurrency = 'usdtbsc'
  const [activePayment, setActivePayment] = useState(null)  // open modal data

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, pkgRes] = await Promise.all([
        api.get('/member/dashboard'),
        api.get('/trades/active'),
      ])
      setWallets(dashRes.data.stats)
      setPackages(pkgRes.data.packages || [])
    } catch {
      toast.error('Could not load trading environment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Wallet invest (fund / income)
  const onSubmitWallet = async (e) => {
    e.preventDefault()
    if (!amount || amount < 20)    return toast.error('Minimum investment is $20')
    if (amount % 10 !== 0)         return toast.error('Amount must be a multiple of $10')
    if (amount > 5000)             return toast.error('Maximum investment is $5,000')
    if (!pin || pin.length !== 6)  return toast.error('Enter your 6-digit security PIN')

    const sourceKey = source === 'fund_wallet' ? 'fund' : 'income'
    if (amount > wallets[source])  return toast.error('Insufficient balance')

    setSubmitting(true)
    try {
      await api.post('/trades/invest', { amount: +amount, source: sourceKey, pin })
      toast.success('Investment successful!')
      useAuthStore.getState().refreshUser()
      setAmount('')
      setPin('')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Investment failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Crypto pay flow
  const onSubmitCrypto = async (e) => {
    e.preventDefault()
    if (!amount || amount < 20)  return toast.error('Minimum investment is $20')
    if (amount % 10 !== 0)       return toast.error('Amount must be a multiple of $10')
    if (amount > 5000)           return toast.error('Maximum investment is $5,000')
    if (!payCurrency)            return toast.error('Select a cryptocurrency')

    setSubmitting(true)
    try {
      const { data } = await api.post('/nowpayments/create-payment', {
        amount:       +amount,
        pay_currency: payCurrency,
      })
      setActivePayment(data)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create payment')
    } finally {
      setSubmitting(false)
    }
  }

  const onPaymentSuccess = () => {
    setActivePayment(null)
    toast.success('🎉 Package activated! Daily profits will start accruing.', { duration: 6000 })
    useAuthStore.getState().refreshUser()
    setAmount('')
    loadData()
  }

  const PACKAGE_COLS = [
    { key: 'amount',     label: 'Invested', render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${(+v).toLocaleString()}</span> },
    { key: 'total_earned', label: 'Earned', render: (v) => <span style={{ color: 'var(--green)', fontWeight: 700 }}>${(+v).toLocaleString()}</span> },
    { key: 'status',     label: 'Status',   render: (v) => <Badge status={v} /> },
    { key: 'started_at', label: 'Date',     render: (v) => <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{new Date(v).toLocaleDateString()}</span> },
  ]

  const isCrypto = source === 'crypto'

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Start Trading"
        subtitle="Activate a new investment to earn daily profit"
        action={
          <button onClick={loadData} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800 }}>
            <RefreshCw size={14} /> <span>Refresh</span>
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }} id="trade-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>

          {/* Source Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--gap-md)' }} id="trade-inputs">
            {/* Deposit Wallet */}
            <button
              onClick={() => setSource('fund_wallet')}
              className={`trade-source-card ${source === 'fund_wallet' ? 'active' : ''}`}
              style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--panel-bg)', border: '1px solid var(--border)', textAlign: 'left', transition: 'var(--transition-normal)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--purple-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={14} style={{ color: 'var(--purple)' }} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Deposit</span>
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>${(+wallets.fund_wallet).toLocaleString()}</p>
            </button>

            {/* Profit Wallet */}
            <button
              onClick={() => setSource('income_wallet')}
              className={`trade-source-card ${source === 'income_wallet' ? 'active' : ''}`}
              style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--panel-bg)', border: '1px solid var(--border)', textAlign: 'left', transition: 'var(--transition-normal)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={14} style={{ color: 'var(--cyan)' }} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Profit</span>
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>${(+wallets.income_wallet).toLocaleString()}</p>
            </button>

            {/* Crypto Pay */}
            <button
              onClick={() => setSource('crypto')}
              className={`trade-source-card ${source === 'crypto' ? 'active-crypto' : ''}`}
              style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--panel-bg)', border: '1px solid var(--border)', textAlign: 'left', transition: 'var(--transition-normal)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(247,147,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bitcoin size={14} style={{ color: '#F7931A' }} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Crypto Pay</span>
              </div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F7931A' }}>Pay with crypto</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>Auto-activates ✓</p>
            </button>
          </div>

          {/* Settings Form */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <TrendingUp size={20} style={{ color: isCrypto ? '#F7931A' : 'var(--cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isCrypto ? 'Crypto Payment Settings' : 'Investment Settings'}
              </h3>
              {isCrypto && (
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 800, color: '#F7931A', background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: 6, padding: '0.15rem 0.5rem' }}>
                  POWERED BY NOWPAYMENTS
                </span>
              )}
            </div>

            <form onSubmit={isCrypto ? onSubmitCrypto : onSubmitWallet} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Amount picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Choose Amount</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[20, 50, 100, 250, 500, 1000, 2000, 5000].map((v) => (
                    <button
                      key={v} type="button"
                      onClick={() => setAmount(v.toString())}
                      style={{
                        padding: '0.875rem 0.5rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: amount === v.toString() ? (isCrypto ? 'rgba(247,147,26,0.1)' : 'var(--cyan-glow)') : 'rgba(255,255,255,0.02)',
                        color: amount === v.toString() ? (isCrypto ? '#F7931A' : 'var(--cyan)') : 'var(--text-muted)',
                        fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer', transition: 'var(--transition-normal)',
                        borderColor: amount === v.toString() ? (isCrypto ? 'rgba(247,147,26,0.4)' : 'var(--cyan)') : 'var(--border)',
                      }}
                    >
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount + Currency / PIN row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Custom Amount ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-faint)' }}>$</span>
                    <input
                      type="number" value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Min $20 - Max $5,000"
                      autoComplete="off" className="input"
                      style={{ paddingLeft: '2rem', fontSize: '1rem', fontWeight: 700 }}
                    />
                  </div>
                  {!isCrypto && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      Balance: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>${(+wallets[source] || 0).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                {isCrypto ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Pay With</label>
                    <div className="input" style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      fontSize: '0.9rem', fontWeight: 700, cursor: 'default',
                      background: 'rgba(38,161,123,0.06)', borderColor: 'rgba(38,161,123,0.3)',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>💵</span>
                      <span style={{ color: 'var(--text-primary)' }}>USDT (BEP-20)</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 800, color: '#26A17B', background: 'rgba(38,161,123,0.1)', border: '1px solid rgba(38,161,123,0.25)', borderRadius: 5, padding: '0.1rem 0.4rem' }}>BNB Chain</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#F7931A' }}>
                      No PIN required • Pays directly from your crypto wallet
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Transaction PIN</label>
                    <input
                      type="password" maxLength={6} value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="6-digit PIN"
                      className="input"
                      style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.2em' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Manage in profile settings</p>
                  </div>
                )}
              </div>

              {/* Info banner */}
              <div style={{
                background: isCrypto ? 'rgba(247,147,26,0.04)' : 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isCrypto ? 'rgba(247,147,26,0.15)' : 'var(--border)'}`,
                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: isCrypto ? 'rgba(247,147,26,0.1)' : 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isCrypto ? <Zap size={20} style={{ color: '#F7931A' }} /> : <ShieldCheck size={20} style={{ color: 'var(--cyan)' }} />}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {isCrypto
                    ? 'A crypto payment address will be generated. Send the exact amount to auto-activate your package — no manual approval required.'
                    : 'Your investment will start generating daily profit. Track your earnings in the profit chart.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ height: 50, background: isCrypto ? 'linear-gradient(135deg, #F7931A, #e8820a)' : undefined, border: 'none' }}
              >
                {submitting
                  ? <Loader2 size={18} className="animate-spin" />
                  : isCrypto
                    ? <><Bitcoin size={18} /><span>Generate Payment Address</span></>
                    : <><ShieldCheck size={18} /><span>Start Investment</span></>
                }
              </button>
            </form>
          </Panel>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Info size={24} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>How it works</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  Your investment earns daily profit until it reaches 200% total return. Profits are credited to your profit wallet daily.
                </p>
              </div>
            </div>
          </Panel>

          {/* Crypto pay info card */}
          <Panel style={{ background: 'rgba(247,147,26,0.02)', border: '1px solid rgba(247,147,26,0.12)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Bitcoin size={24} style={{ color: '#F7931A', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Pay with Crypto</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  Send USDT, BTC, ETH, or other supported tokens directly. Package activates <strong style={{ color: '#F7931A' }}>automatically</strong> once the blockchain confirms your payment — no admin approval needed.
                </p>
              </div>
            </div>
          </Panel>

          {/* Active packages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Activity size={18} style={{ color: 'var(--green)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Active Investments</p>
            </div>
            <DataTable columns={PACKAGE_COLS} data={packages} emptyText="No active investments found." />
          </div>
        </div>
      </div>

      {/* Crypto Payment Modal */}
      {activePayment && (
        <CryptoPaymentModal
          payment={activePayment}
          onClose={() => setActivePayment(null)}
          onSuccess={onPaymentSuccess}
        />
      )}

      <style>{`
        .trade-source-card:hover { border-color: var(--cyan); background: rgba(0,212,255,0.02) !important; }
        .trade-source-card.active { border-color: var(--cyan) !important; background: var(--cyan-glow) !important; box-shadow: 0 0 15px rgba(0,212,255,0.1); }
        .trade-source-card.active-crypto { border-color: rgba(247,147,26,0.4) !important; background: rgba(247,147,26,0.06) !important; box-shadow: 0 0 15px rgba(247,147,26,0.1); }
        @media (max-width: 1023px) { #trade-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px)  { #trade-inputs { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  )
}
