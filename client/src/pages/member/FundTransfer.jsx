import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send, User, ShieldCheck, Wallet, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, StatCard, Panel, Spinner } from '../../components/member/ui'
import useAuthStore from '../../store/useAuthStore'

const schema = z.object({
  receiverUserId: z.string().length(6, 'Member ID must be 6 characters'),
  amount:         z.coerce.number().min(1, 'Minimum transfer is $1'),
  pin:            z.string().length(6, 'Enter your 6-digit transaction PIN'),
})

export default function FundTransfer() {
  const { user, refreshUser } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [receiverName, setReceiverName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [fundBalance, setFundBalance] = useState(user?.fund_wallet_balance ?? 0)

  // Fetch live balance on mount
  useEffect(() => {
    api.get('/member/dashboard')
      .then(({ data }) => setFundBalance(data.user?.fund_wallet_balance ?? 0))
      .catch(() => setFundBalance(user?.fund_wallet_balance ?? 0))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { receiverUserId: '', amount: '', pin: '' },
  })

  const receiverId = watch('receiverUserId')

  /** Live lookup — fires when receiverUserId changes to exactly 6 chars */
  const verifyUser = useCallback(async (id) => {
    const trimmed = id?.trim()
    if (!trimmed || trimmed.length !== 6) {
      setReceiverName('')
      return
    }
    setVerifying(true)
    try {
      const { data } = await api.get(`/member/search?userId=${trimmed}`)
      setReceiverName(data.name)
    } catch {
      setReceiverName('')
    } finally {
      setVerifying(false)
    }
  }, [])

  useEffect(() => { verifyUser(receiverId) }, [receiverId, verifyUser])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const res = await api.post('/funds/transfer', data)
      toast.success(res.data.message)
      reset()
      setReceiverName('')
      // Refresh balance after successful transfer
      api.get('/member/dashboard')
        .then(({ data: d }) => {
          setFundBalance(d.user?.fund_wallet_balance ?? 0)
          refreshUser()
        })
        .catch(() => {})
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Wallet to Wallet Transfer" subtitle="Transfer funds from your wallet to another member instantly" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          <StatCard label="Fund Wallet Balance" value={`$${Number(fundBalance).toFixed(2)}`} icon={Wallet} color="cyan" />

          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Receiver Member ID</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                  <input
                    {...register('receiverUserId')}
                    placeholder="Enter 6-digit Member ID"
                    className="input"
                    style={{ paddingLeft: '2.75rem' }}
                    maxLength={6}
                  />
                  {verifying && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)' }} />}
                  {!verifying && receiverName && <ShieldCheck size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--green)' }} />}
                  {!verifying && receiverId?.trim().length === 6 && !receiverName && <XCircle size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--red)' }} />}
                </div>
                {receiverName && <p style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700, marginTop: '0.5rem' }}>✓ Receiver: {receiverName}</p>}
                {!verifying && receiverId?.trim().length === 6 && !receiverName && <p style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600, marginTop: '0.5rem' }}>✗ Member not found</p>}
                {errors.receiverUserId && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.receiverUserId.message}</p>}
              </div>


              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transfer Amount ($)</label>
                  <input {...register('amount')} type="number" placeholder="0.00" className="input" />
                  {errors.amount && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.amount.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Transaction PIN</label>
                  <input {...register('pin')} type="password" maxLength={6} placeholder="6-digit PIN" className="input" style={{ textAlign: 'center', letterSpacing: '0.3em' }} />
                  {errors.pin && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.pin.message}</p>}
                </div>
              </div>

              <button type="submit" disabled={submitting || (receiverId?.length === 6 && !receiverName)} className="btn-primary" style={{ height: 50 }}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /><span>Transfer Now</span></>}
              </button>
            </form>
          </Panel>
        </div>

        <div>
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Transfer Rules</h3>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Transfer from <strong>Fund Wallet</strong> only.</li>
              <li>Instantly credited to receiver's Fund Wallet.</li>
              <li>Zero internal transfer fees.</li>
              <li>Recipient must be a valid Novatrix member.</li>
              <li>Wallet to Wallet transfers are final and non-reversible.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
