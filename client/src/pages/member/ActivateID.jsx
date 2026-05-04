import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Zap, User, ShieldCheck, Wallet, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, Panel } from '../../components/member/ui'

const schema = z.object({
  targetUserId: z.string().min(4, 'Enter a valid Member ID').max(10, 'Invalid Member ID'),
  amount:       z.coerce.number()
    .min(20, 'Minimum activation is $20')
    .refine(val => val % 10 === 0, 'Amount must be in multiples of $10'),
  pin:          z.string().length(6, 'Enter your 6-digit transaction PIN'),
})

export default function ActivateID() {
  const [submitting,  setSubmitting]  = useState(false)
  const [targetName,  setTargetName]  = useState('')
  const [verifying,   setVerifying]   = useState(false)
  const [fundBalance, setFundBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { targetUserId: '', amount: '', pin: '' },
  })

  const targetId = watch('targetUserId')

  // Live member lookup whenever targetUserId changes
  useEffect(() => { verifyUser(targetId) }, [targetId]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Fetch live fund wallet balance from API */
  const fetchBalance = async () => {
    setBalanceLoading(true)
    try {
      const { data } = await api.get('/member/dashboard')
      setFundBalance(parseFloat(data.stats?.fund_wallet ?? data.user?.fund_wallet_balance ?? 0))
    } catch {
      setFundBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }

  useEffect(() => { fetchBalance() }, [])

  /** Verify target member ID — triggered live once ID is exactly 6 chars */
  const verifyUser = async (id) => {
    const trimmed = id?.trim()
    if (!trimmed || trimmed.length !== 6) {
      setTargetName('')
      return
    }
    setVerifying(true)
    try {
      const { data } = await api.get(`/member/search?userId=${trimmed}`)
      setTargetName(data.name)
    } catch {
      setTargetName('')
    } finally {
      setVerifying(false)
    }
  }

  const onSubmit = async (data) => {
    if (fundBalance !== null && parseFloat(data.amount) > fundBalance) {
      toast.error('Insufficient fund wallet balance')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/trades/activate-for-other', data)
      toast.success(res.data.message || 'ID activated successfully!')
      reset()
      setTargetName('')
      // Refresh balance after successful activation
      fetchBalance()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Activation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="External ID Activation" subtitle="Use your fund wallet to activate another member's trading package" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>

          {/* Live Fund Wallet Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,212,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wallet size={20} style={{ color: 'var(--cyan)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Fund Wallet Balance</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {balanceLoading ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cyan)' }} /> : fmt(fundBalance)}
                </p>
              </div>
            </div>
            <button
              onClick={fetchBalance}
              disabled={balanceLoading}
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: 'var(--text-faint)' }}
              title="Refresh balance"
            >
              <RefreshCw size={14} style={{ animation: balanceLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Target Member ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Member ID</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                  <input
                    {...register('targetUserId')}
                    placeholder="Enter 6-digit Member ID"
                    className="input"
                    style={{ paddingLeft: '2.75rem' }}
                    maxLength={6}
                  />
                  {verifying && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)' }} />}
                  {!verifying && targetName && <ShieldCheck size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--green)' }} />}
                  {!verifying && targetId?.trim().length === 6 && !targetName && <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--red)', fontSize: '1rem' }}>✕</span>}
                </div>
                {targetName && <p style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700, marginTop: '0.5rem' }}>✓ Target: {targetName}</p>}
                {errors.targetUserId && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.targetUserId.message}</p>}
              </div>

              {/* Amount + PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Investment Amount ($)</label>
                  <input {...register('amount')} type="number" min={20} step={10} placeholder="Min. $20 (Multiples of $10)" className="input" />
                  {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transaction PIN</label>
                  <input {...register('pin')} type="password" maxLength={6} placeholder="6-digit PIN" className="input" style={{ textAlign: 'center', letterSpacing: '0.3em' }} />
                  {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
                </div>
              </div>

              {/* Insufficient balance warning */}
              {fundBalance !== null && !balanceLoading && fundBalance === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--orange)', fontWeight: 600, padding: '0.75rem', background: 'rgba(249,115,22,0.08)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
                  ⚠ Your fund wallet balance is $0.00. Please add funds before activating another ID.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || balanceLoading || (targetId?.trim().length >= 4 && !targetName)}
                className="btn-primary"
                style={{ height: 50, background: 'var(--purple-gradient)', border: 'none' }}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /><span>Activate ID Now</span></>}
              </button>
            </form>
          </Panel>
        </div>

        {/* Rules panel */}
        <div>
          <Panel style={{ background: 'rgba(168,85,247,0.02)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>ID Activation Rules</h3>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Activation uses your <strong>Fund Wallet</strong> balance.</li>
              <li>Minimum activation amount is <strong>$20</strong> (Multiples of $10).</li>
              <li>Maximum activation per transaction is <strong>$5,000</strong>.</li>
              <li>The target member will be marked as <strong>Active</strong> instantly.</li>
              <li>Sponsor bonuses will be distributed to the target member's uplines.</li>
              <li>ID activation is a permanent action.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
