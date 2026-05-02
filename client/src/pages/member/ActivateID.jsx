import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Zap, User, ShieldCheck, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, Panel } from '../../components/member/ui'
import useAuthStore from '../../store/useAuthStore'

const schema = z.object({
  targetUserId: z.string().length(6, 'Member ID must be 6 characters'),
  amount:       z.coerce.number()
    .min(20, 'Minimum activation is $20')
    .refine(val => val % 10 === 0, 'Amount must be in multiples of $10'),
  pin:          z.string().length(6, 'Enter your 6-digit transaction PIN'),
})

export default function ActivateID() {
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [targetName, setTargetName] = useState('')
  const [verifying, setVerifying] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const targetId = watch('targetUserId')

  const verifyUser = async () => {
    if (targetId?.length !== 6) return
    setVerifying(true)
    try {
      const { data } = await api.get(`/member/search?userId=${targetId}`)
      setTargetName(data.name)
    } catch {
      setTargetName('')
    } finally {
      setVerifying(false)
    }
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const res = await api.post('/trades/activate-for-other', data)
      toast.success(res.data.message)
      reset()
      setTargetName('')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Activation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="External ID Activation" subtitle="Use your fund wallet to activate another member's trading package" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <StatCard label="Fund Wallet Balance" value={`$${user?.fund_wallet_balance || 0}`} icon={Wallet} color="cyan" />

          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Member ID</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                  <input 
                    {...register('targetUserId')} 
                    placeholder="Enter 6-digit ID to activate" 
                    className="input" 
                    style={{ paddingLeft: '2.75rem' }} 
                    onBlur={verifyUser}
                  />
                  {verifying && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)' }} />}
                </div>
                {targetName && <p style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700, marginTop: '0.5rem' }}>✓ Target: {targetName}</p>}
                {errors.targetUserId && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.targetUserId.message}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Investment Amount ($)</label>
                  <input {...register('amount')} type="number" min={20} placeholder="Min. $20 (Multiples of $10)" className="input" />
                  {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transaction PIN</label>
                  <input {...register('pin')} type="password" maxLength={6} placeholder="6-digit PIN" className="input" style={{ textAlign: 'center', letterSpacing: '0.3em' }} />
                  {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
                </div>
              </div>

              <button type="submit" disabled={submitting || (targetId?.length === 6 && !targetName)} className="btn-primary" style={{ height: 50, background: 'var(--purple-gradient)', border: 'none' }}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /><span>Activate ID Now</span></>}
              </button>
            </form>
          </Panel>
        </div>

        <div>
          <Panel style={{ background: 'rgba(168,85,247,0.02)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>ID Activation Rules</h3>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Activation used <strong>Fund Wallet</strong> balance.</li>
              <li>Minimum activation amount is <strong>$20</strong> (Multiples of $10).</li>
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
