import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowRight, History, Send, Wallet, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, DataTable, Spinner, Badge, Panel } from '../../components/member/ui'

const transferSchema = z.object({
  amount: z.coerce.number().min(10, 'Minimum transfer is $10'),
  pin:    z.string().length(6, 'Enter your 6-digit transaction PIN'),
})

const LEDGER_COLS = [
  { label: 'SR.NO.',      render: (v, row, i) => <span style={{ fontWeight: 800, color: 'var(--text-faint)' }}>{i + 1}</span> },
  { key: 'created_at',   label: 'DATE & TIME', render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
  { key: 'amount',       label: 'AMOUNT',     render: (v, row) => (
    <span style={{ fontWeight: 900, color: row.type === 'credit' ? 'var(--green)' : 'var(--red)' }}>
      {row.type === 'credit' ? '+' : '-'}${(+v).toLocaleString()}
    </span>
  )},
  { key: 'remarks',      label: 'REMARKS',    render: (v) => <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{v || '—'}</span> },
]

export default function IncomeWalletPage() {
  const [balance,    setBalance]    = useState(0)
  const [ledger,     setLedger]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tab,        setTab]        = useState('ledger')

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(transferSchema),
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dashRes, ledgerRes] = await Promise.all([
        api.get('/member/dashboard'),
        api.get('/income-wallet/ledger'),
      ])
      setBalance(dashRes.data.stats.income_wallet)
      setLedger(ledgerRes.data.ledger || [])
    } catch { toast.error('Could not load wallet data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const onTransfer = async (data) => {
    setSubmitting(true)
    try {
      await api.post('/income-wallet/fund-transfer', data)
      toast.success(`$${data.amount} moved to Fund Reserve`)
      reset()
      fetchData()
      setTab('ledger')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Transfer failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Profit Management" subtitle="Audit your algorithmic earnings and move assets to investment reserves" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }} id="income-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <StatCard label="Liquid Profit Balance" value={`$${(+balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Wallet} color="purple" sub="Ready for withdrawal or internal transfer" />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
            {[
              { id: 'ledger',   label: 'Asset Ledger', icon: History },
              { id: 'transfer', label: 'Internal Migration', icon: Send },
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

          {tab === 'ledger' && (
            <div className="scale-in">
              <DataTable columns={LEDGER_COLS} data={ledger} emptyText="No asset movements discovered in the registry." />
            </div>
          )}

          {tab === 'transfer' && (
            <Panel className="scale-in">
              <form onSubmit={handleSubmit(onTransfer)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={18} style={{ color: 'var(--cyan)' }} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Fund Migration</h3>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Move earned capital from your <strong>Profit Wallet</strong> to the <strong>Fund Reserve</strong>. Assets in the Fund Reserve can be used to activate new trade packages.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} id="transfer-inputs">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transfer Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '0.875rem', fontWeight: 600 }}>$</span>
                      <input {...register('amount')} type="number" min={10} max={balance} placeholder="Min. $10" className="input" style={{ paddingLeft: '2rem' }} />
                    </div>
                    {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Authorization PIN</label>
                    <input {...register('pin')} type="password" maxLength={6} placeholder="6-digit PIN" className="input" style={{ letterSpacing: '0.5em', textAlign: 'center' }} />
                    {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 50 }}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /><span>Authorize Internal Migration</span></>}
                </button>
              </form>
            </Panel>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Info size={24} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Protocol Information</p>
                <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
                  <li>Internal transfers are <strong>instant</strong> and have <strong>zero fees</strong>.</li>
                  <li>Minimum migration amount is <strong>$10.00</strong>.</li>
                  <li>Assets moved to Fund Reserve <strong>cannot be reversed</strong> back to Profit Wallet.</li>
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          #income-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          #transfer-inputs { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
