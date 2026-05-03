import { useEffect, useState } from 'react'
import {
  TrendingUp, Wallet, DollarSign, ArrowRight,
  ShieldCheck, Loader2, Info, Activity, AlertTriangle, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../store/useAuthStore'
import { PageHeader, Spinner, Panel, DataTable, Badge } from '../../components/member/ui'

const PACKAGES = [
  { id: 'starter', label: 'Starter Protocol', min: 20,  max: 999,  yield: '0.5% - 0.75%', color: 'var(--cyan)'   },
  { id: 'pro',     label: 'Pro Alpha',        min: 1000,max: 4999, yield: '0.8% - 1.25%', color: 'var(--purple)' },
  { id: 'elite',   label: 'Elite Nexus',      min: 5000,max: 5000, yield: '1.3% - 2.00%', color: 'var(--green)'  },
]

export default function TradePage() {
  const { user }                  = useAuthStore()
  const [wallets, setWallets]     = useState({ fund_wallet: 0, income_wallet: 0 })
  const [packages, setPackages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount]       = useState('20')
  const [source, setSource]       = useState('fund_wallet')
  const [pin, setPin]             = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, pkgRes] = await Promise.all([
        api.get('/member/dashboard'),
        api.get('/trades/active')
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

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!amount || amount < 20) return toast.error('Minimum investment is $20')
    if (amount % 10 !== 0) return toast.error('Investment amount must be in multiples of $10')
    if (amount > 5000) return toast.error('Maximum investment is $5,000')
    if (!pin || pin.length !== 6) return toast.error('Enter your 6-digit security PIN')
    
    const sourceKey = source === 'fund_wallet' ? 'fund' : 'income'
    if (amount > wallets[source]) return toast.error(`Insufficient balance`)
    
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

  const PACKAGE_COLS = [
    { key: 'amount', label: 'Invested', render: (v) => <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${(+v).toLocaleString()}</span> },
    { key: 'total_earned', label: 'Earned', render: (v) => <span style={{ color: 'var(--green)', fontWeight: 700 }}>${(+v).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'started_at', label: 'Date', render: (v) => <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{new Date(v).toLocaleDateString()}</span> },
  ]

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader
        title="Start Trading"
        subtitle="Start a new investment to earn daily profit"
        action={
          <button onClick={loadData} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800 }}>
             <RefreshCw size={14} /> <span>Refresh</span>
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }} id="trade-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          {/* Wallets Display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-md)' }} id="trade-inputs">
            <button
              onClick={() => setSource('fund_wallet')}
              className={`trade-source-card ${source === 'fund_wallet' ? 'active' : ''}`}
              style={{
                padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--panel-bg)',
                border: '1px solid var(--border)', textAlign: 'left', transition: 'var(--transition-normal)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Wallet size={16} style={{ color: 'var(--purple)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Deposit Wallet</span>
              </div>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>${(+wallets.fund_wallet).toLocaleString()}</p>
            </button>

            <button
              onClick={() => setSource('income_wallet')}
              className={`trade-source-card ${source === 'income_wallet' ? 'active' : ''}`}
              style={{
                padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--panel-bg)',
                border: '1px solid var(--border)', textAlign: 'left', transition: 'var(--transition-normal)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <DollarSign size={16} style={{ color: 'var(--cyan)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Profit Wallet</span>
              </div>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>${(+wallets.income_wallet).toLocaleString()}</p>
            </button>
          </div>

          {/* Configuration */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <TrendingUp size={20} style={{ color: 'var(--cyan)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Investment Settings</h3>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Choose Amount</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[20, 30, 50, 100, 250, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v.toString())}
                      style={{
                        padding: '0.875rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                        background: amount === v.toString() ? 'var(--cyan-glow)' : 'rgba(255,255,255,0.02)',
                        color: amount === v.toString() ? 'var(--cyan)' : 'var(--text-muted)',
                        fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer', transition: 'var(--transition-normal)',
                        borderColor: amount === v.toString() ? 'var(--cyan)' : 'var(--border)'
                      }}
                    >
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Custom Amount ($)</label>
                  <div style={{ position: 'relative' }}>
                     <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-faint)' }}>$</span>
                       <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Min $20 - Max $5,000"
                        autoComplete="off"
                        className="input"
                        style={{ paddingLeft: '2rem', fontSize: '1rem', fontWeight: 700 }}
                      />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Balance: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>${(+wallets[source]).toLocaleString()}</span></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Transaction PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="6-digit PIN"
                    className="input"
                    style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.2em' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Manage in profile settings</p>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                   <ShieldCheck size={20} style={{ color: 'var(--cyan)' }} />
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Your investment will start generating daily profit. You can track your earnings in the profit chart.
                </p>
              </div>

              <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 50 }}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /><span>Start Investment</span></>}
              </button>
            </form>
          </Panel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Info size={24} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>How it works</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  Your investment will earn daily profit until it reaches 200% total return. Profits are added to your profit wallet every day.
                </p>
              </div>
            </div>
          </Panel>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Activity size={18} style={{ color: 'var(--green)' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Active Investments</p>
             </div>
             <DataTable columns={PACKAGE_COLS} data={packages} emptyText="No active investments found." />
          </div>
        </div>
      </div>

      <style>{`
        .trade-source-card:hover { border-color: var(--cyan); background: rgba(0,212,255,0.02) !important; }
        .trade-source-card.active { border-color: var(--cyan) !important; background: var(--cyan-glow) !important; box-shadow: 0 0 15px rgba(0,212,255,0.1); }
        @media (max-width: 1023px) { #trade-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 639px) { #trade-inputs { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
