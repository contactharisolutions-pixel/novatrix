import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle, CheckCircle, ShieldCheck, Wallet, Copy, Edit2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Spinner, Panel } from '../../components/member/ui'

const schema = z.object({
  bep20_wallet: z.string().min(20, 'Please enter a valid USDT address'),
  pin:          z.string().length(6, 'Enter your 6-digit Security PIN'),
})

export default function WalletSetupPage() {
  const [current,  setCurrent]  = useState('')
  const [loading,  setLoading]  = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [copied,    setCopied]    = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    api.get('/member/profile')
      .then(({ data }) => setCurrent(data.bep20_wallet || ''))
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (data) => {
    try {
      await api.put('/member/wallet-address', data)
      setCurrent(data.bep20_wallet)
      setIsEditing(false)
      toast.success('Payout wallet updated successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(current)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Address copied to clipboard')
  }

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', maxWidth: 600 }}>
      <PageHeader title="Payout Wallet" subtitle="Where you receive your funds" />

      {current && !isEditing ? (
        <Panel style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid var(--border-cyan)', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid var(--green)' }}>
            <CheckCircle size={32} style={{ color: 'var(--green)' }} />
          </div>
          
          <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Your Active Payout Address</p>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem', position: 'relative' }}>
            <code style={{ fontSize: '1rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', wordBreak: 'break-all', fontWeight: 700 }}>{current}</code>
            <button onClick={copy} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-faint)' }}>
               {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                This address is used for all your withdrawals. You can update it anytime using your Security PIN.
              </p>
            </div>
            <button onClick={() => { setIsEditing(true); setValue('bep20_wallet', current) }} 
              className="btn-secondary" style={{ height: 46, gap: '0.75rem' }}>
              <Edit2 size={16} /> <span>Change Wallet Address</span>
            </button>
          </div>
        </Panel>
      ) : (
        <>
          {!current && (
            <Panel style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--orange)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--orange)' }}>Wallet Not Set</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Add your USDT address to start receiving payments.</p>
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} style={{ color: 'var(--cyan)' }} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{current ? 'Update Wallet' : 'Set Up Wallet'}</h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>USDT Address (BEP20)</label>
                <input {...register('bep20_wallet')} placeholder="0x..." className="input mono" style={{ fontSize: '0.8125rem' }} />
                {errors.bep20_wallet && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.bep20_wallet.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Security PIN</label>
                <input {...register('pin')} type="password" maxLength={6} placeholder="••••••" className="input" style={{ letterSpacing: '0.5em', textAlign: 'center' }} />
                {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem' }}>
                <Info size={16} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Please ensure this is a <strong>BEP20</strong> address. Sending funds to the wrong network may result in permanent loss.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {isEditing && (
                  <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary" style={{ flex: 1, height: 50 }}>
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 2, height: 50 }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <span>{current ? 'Save Changes' : 'Save Wallet'}</span>}
                </button>
              </div>
            </form>
          </Panel>
        </>
      )}
    </div>
  )
}
