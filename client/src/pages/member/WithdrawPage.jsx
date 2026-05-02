import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle, ArrowUpFromLine, Wallet, History as HistoryIcon, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, DataTable, Badge, Spinner, Panel } from '../../components/member/ui'

const FEE_PERCENT = 10

const schema = z.object({
  amount: z.coerce.number()
    .min(20, 'Minimum withdrawal is $20')
    .refine(val => val % 10 === 0, 'Amount must be in multiples of $10'),
  pin:    z.string().length(6, 'Enter your 6-digit transaction PIN'),
})

const HIST_COLS = [
  { label: 'SR.NO.',      render: (v, row, i) => <span style={{ fontWeight: 800, color: 'var(--text-faint)' }}>{i + 1}</span> },
  { key: 'created_at',   label: 'DATE & TIME', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
  { key: 'amount',        label: 'AMOUNT',   render: (v) => <span style={{ fontWeight: 700 }}>${(+v).toLocaleString()}</span> },
  { key: 'net_amount',    label: 'RECEIVED', render: (v) => <span style={{ color: 'var(--green)', fontWeight: 800 }}>${(+v).toLocaleString()}</span> },
  { key: 'status',        label: 'STATUS',  render: (v) => <Badge status={v} /> },
]

export default function WithdrawPage() {
  const [balance,    setBalance]    = useState(0)
  const [wallet,     setWallet]     = useState('')
  const [history,    setHistory]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tab,        setTab]        = useState('request')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, pin: '' }
  })
  const amount = watch('amount') || 0
  const fee    = +(amount * FEE_PERCENT / 100).toFixed(2)
  const net    = +(amount - fee).toFixed(2)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dashRes, histRes, profileRes] = await Promise.all([
        api.get('/member/dashboard'),
        api.get('/withdrawals/history'),
        api.get('/member/profile'),
      ])
      setBalance(dashRes.data.stats.income_wallet)
      setHistory(histRes.data.withdrawals || [])
      setWallet(profileRes.data.bep20_wallet || '')
    } catch { toast.error('Could not load withdrawal data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const onSubmit = async (data) => {
    if (!wallet) return toast.error('Please set your BEP20 wallet address in profile first')
    if (data.amount > balance) return toast.error('Insufficient income wallet balance')
    setSubmitting(true)
    try {
      await api.post('/withdrawals/request', data)
      toast.success('Withdrawal request submitted!')
      reset()
      fetchData()
      setTab('history')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Withdrawal failed')
    } finally { setSubmitting(false) }
  }

  const fmt = (n) => `$${(+n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Withdraw Funds" subtitle="Cash out your profit to your USDT (BEP20) wallet" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }} id="withdraw-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <StatCard label="Available Profit" value={fmt(balance)} icon={Wallet} color="cyan" sub="Profit available to withdraw" />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
            {[
              { id: 'request', label: 'New Withdrawal', icon: ArrowUpFromLine },
              { id: 'history', label: 'Withdrawal History', icon: HistoryIcon },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 700,
                  color: tab === t.id ? 'var(--cyan)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${tab === t.id ? 'var(--cyan)' : 'transparent'}`,
                  transition: 'var(--transition-normal)', marginBottom: '-2px',
                }}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'request' && (
            <Panel className="scale-in">
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Wallet display */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>My Wallet Address</p>
                  {wallet ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
                      </div>
                      <code style={{ fontSize: '0.8125rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{wallet}</code>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--orange)' }}>
                      <AlertTriangle size={18} />
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Wallet not set. <Link to="/dashboard/wallet-setup" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Set up your wallet →</Link>
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} id="withdraw-inputs">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Withdrawal Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '0.875rem', fontWeight: 600 }}>$</span>
                      <input {...register('amount')} type="number" min={20} step={10} max={balance} placeholder="Min. $20 (Multiples of $10)" className="input" style={{ paddingLeft: '2rem' }} autoComplete="off" />
                    </div>
                    {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transaction PIN</label>
                    <input {...register('pin')} type="password" maxLength={6} placeholder="6-digit PIN" className="input" style={{ letterSpacing: '0.5em', textAlign: 'center' }} />
                    {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
                  </div>
                </div>

                {amount >= 10 && (
                  <div style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid var(--border-cyan)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Requested Amount</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>${(+amount).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-cyan)' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fee ({FEE_PERCENT}%)</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--red)', fontWeight: 700 }}>-${fee.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 800 }}>Amount You Receive</span>
                      <span style={{ fontSize: '1.25rem', color: 'var(--green)', fontWeight: 900 }}>${net.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={submitting || !wallet} className="btn-primary" style={{ height: 50 }}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ArrowUpFromLine size={18} /><span>Withdraw Now</span></>}
                </button>
              </form>
            </Panel>
          )}

          {tab === 'history' && (
            <div className="scale-in">
              <DataTable columns={HIST_COLS} data={history} emptyText="No transaction history discovered." />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <Panel style={{ background: 'rgba(249,115,22,0.02)', border: '1px solid var(--border-orange)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Withdrawal Policy</p>
                <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                  <li>Withdrawal Days: <strong>Monday to Friday</strong></li>
                  <li>Withdrawal Time: <strong>6:00 AM to 11:00 AM IST</strong></li>
                  <li>Minimum amount: <strong>$20.00</strong></li>
                  <li>Amount must be in <strong>multiples of $10</strong></li>
                  <li>Processing fee: <strong>{FEE_PERCENT}% per request</strong></li>
                  <li>Withdrawals are processed to your registered BEP20 address.</li>
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          #withdraw-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          #withdraw-inputs { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
