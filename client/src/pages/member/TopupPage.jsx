import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, QrCode, Loader2, CheckCircle, Copy, ShieldCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Panel } from '../../components/member/ui'

// Initial placeholder, will be replaced by dynamic settings from backend
const DEFAULT_ADDRESS = 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXnovatrix'

const schema = z.object({
  amount:  z.coerce.number()
    .min(20, 'Minimum deposit is $20')
    .refine(val => val % 10 === 0, 'Amount must be in multiples of $10'),
  tx_hash: z.string().min(10, 'Enter the transaction hash from your wallet'),
})

const QUICK_AMOUNTS = [20, 30, 50, 100, 250, 500, 1000, 5000]

export default function TopupPage() {
  const [screenshot, setScreenshot]     = useState(null)
  const [previewUrl,  setPreviewUrl]    = useState(null)
  const [submitted,   setSubmitted]     = useState(false)
  const [loading,     setLoading]       = useState(false)
  const [settings,    setSettings]      = useState({ deposit_address: DEFAULT_ADDRESS, deposit_qr_url: null })

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/public/settings')
      if (data.settings) setSettings(data.settings)
    } catch { /* fallback to default */ }
  }

  useEffect(() => { loadSettings() }, [])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })
  const amount = watch('amount')

  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const onSubmit = async (data) => {
    if (!screenshot) return toast.error('Please upload payment screenshot')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('amount',     data.amount)
      fd.append('tx_hash',    data.tx_hash)
      fd.append('screenshot', screenshot)
      await api.post('/deposits/create', fd)
      setSubmitted(true)
      toast.success('Deposit submitted! Admin will approve within 24 hours.')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => `$${(+n || 0).toLocaleString()}`

  if (submitted) {
    return (
      <div className="fade-in" style={{ maxWidth: 500, margin: '5rem auto', textAlign: 'center' }}>
        <Panel style={{ padding: '4rem 2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--green-glow)', border: '2px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem',
          }}>
            <CheckCircle size={40} style={{ color: 'var(--green)' }} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Success!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Your deposit of <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{fmt(amount)}</span> USDT has been submitted for verification. Funds will appear in your Capital Wallet once approved.
          </p>
          <button onClick={() => setSubmitted(false)} className="btn-primary" style={{ width: '100%' }}>
            Return to Deposits
          </button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Add Funds" subtitle="Deposit USDT to your account to start trading" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--gap-md)' }} id="topup-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
          {/* Step 1 — Amount */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--cyan-glow)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>1. Choose Amount</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setValue('amount', a)}
                  className={`amount-btn ${+amount === a ? 'active' : ''}`}
                  style={{
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)',
                    fontSize: '0.875rem', fontWeight: 700, transition: 'var(--transition-normal)', cursor: 'pointer'
                  }}
                >
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '0.875rem', fontWeight: 600 }}>$</span>
              <input
                {...register('amount')}
                type="number"
                placeholder="Custom Amount (Min. $20, Multiples of $10)"
                className="input"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
          </Panel>

          {/* Step 2 — Payment */}
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--cyan)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>2. Send Payment</p>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ padding: '1rem', background: '#fff', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                {settings.deposit_qr_url ? (
                  <img src={settings.deposit_qr_url} alt="USDT QR" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                ) : (
                  <QrCode size={100} style={{ color: '#000' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Network (Type)</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--cyan)', fontWeight: 700, marginTop: '0.25rem' }}>USDT BEP20 (BSC)</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Currency</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700, marginTop: '0.25rem' }}>USDT</p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.5rem' }}>USDT Deposit Address</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <code className="input mono" style={{ fontSize: '0.75rem', flex: 1, height: 40, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>{settings.deposit_address}</code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(settings.deposit_address); toast.success('Address copied!') }}
                      className="btn-secondary"
                      style={{ height: 40, padding: '0 1rem' }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '0.875rem', background: 'rgba(249,115,22,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(249,115,22,0.1)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <AlertCircle size={16} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 600 }}>WARNING: Only send USDT via BEP20 network. Asset loss from incorrect network is irreversible.</p>
            </div>
          </Panel>

          {/* Step 3 — Proof */}
          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--cyan-glow)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>3. Upload Proof</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Blockchain Transaction Hash (TxID)</label>
                <input
                  {...register('tx_hash')}
                  placeholder="Paste the unique transaction ID from your wallet"
                  className="input mono"
                  style={{ fontSize: '0.75rem' }}
                />
                {errors.tx_hash && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.tx_hash.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payment Screenshot</label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  height: 180, border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  transition: 'var(--transition-normal)', position: 'relative', overflow: 'hidden'
                }} className="upload-box">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={20} style={{ color: 'var(--text-faint)' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Click to Upload</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.25rem' }}>JPG, PNG up to 10MB</p>
                      </div>
                    </>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
                </label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ height: 50, marginTop: '0.5rem' }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /><span>Submit Deposit</span></>}
              </button>
            </form>
          </Panel>
        </div>
      </div>

      <style>{`
        .amount-btn:hover {
          border-color: var(--cyan);
          background: rgba(0,212,255,0.05) !important;
        }
        .amount-btn.active {
          border-color: var(--cyan) !important;
          background: var(--cyan-glow) !important;
          color: var(--cyan) !important;
          box-shadow: 0 0 15px rgba(0,212,255,0.1);
        }
        .upload-box:hover {
          border-color: var(--cyan);
          background: rgba(0,212,255,0.02);
        }
      `}</style>
    </div>
  )
}
