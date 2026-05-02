import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Wallet, Loader2, ShieldCheck, Mail, Phone, Calendar, Code, UserCheck, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Spinner, Panel } from '../../components/member/ui'

export default function ProfilePage() {
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('info')

  useEffect(() => {
    api.get('/member/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', maxWidth: 1000 }}>
      <PageHeader title="Identity Hub" subtitle={`System ID: ${profile?.user_id}`} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--gap-lg)' }} id="profile-layout">
        {/* Sidebar Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { key: 'info',     label: 'Core Profile',     icon: User },
            { key: 'password', label: 'Password',         icon: Lock },
            { key: 'pin',      label: 'Transaction PIN',  icon: ShieldCheck },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
                background: tab === key ? 'var(--cyan-glow)' : 'transparent',
                border: `1px solid ${tab === key ? 'var(--border-cyan)' : 'transparent'}`,
                color: tab === key ? 'var(--cyan)' : 'var(--text-muted)',
                fontSize: '0.875rem', fontWeight: 700, transition: 'var(--transition-normal)',
                textAlign: 'left', cursor: 'pointer'
              }}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="scale-in">
          {tab === 'info'     && <ProfileInfo profile={profile} setProfile={setProfile} />}
          {tab === 'password' && <ChangePassword />}
          {tab === 'pin'      && <ChangePin />}
        </div>
      </div>

      <style>{`
        @media (max-width: 850px) {
          #profile-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Sub-components ── */

function ProfileInfo({ profile, setProfile }) {
  const schema = z.object({
    name:  z.string().min(3, 'Name is too short'),
    phone: z.string().min(7, 'Invalid phone number'),
  })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: profile?.name, phone: profile?.phone },
  })

  const onSubmit = async (data) => {
    try {
      const { data: updated } = await api.put('/member/profile', data)
      setProfile((p) => ({ ...p, ...updated.user }))
      toast.success('Profile credentials updated!')
    } catch { toast.error('Update failed') }
  }

  const items = [
    { label: 'Email Address', value: profile?.email, icon: Mail },
    { label: 'Account Status', value: profile?.status, icon: UserCheck, color: profile?.status === 'active' ? 'var(--green)' : 'var(--orange)' },
    { label: 'Sponsor Entity', value: profile?.sponsor?.user_id || 'System Root', icon: User },
    { label: 'Referral Token', value: profile?.referral_code, icon: Code },
    { label: 'Registration', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—', icon: Calendar },
  ]

  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <Icon size={14} style={{ color: 'var(--text-faint)' }} />
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</p>
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Update Credentials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} id="info-inputs">
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Legal Name</label>
            <input {...register('name')} className="input" />
            {errors.name && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Phone Contact</label>
            <input {...register('phone')} className="input" />
            {errors.phone && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.phone.message}</p>}
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0 2rem' }}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Profile Changes'}
        </button>
      </form>
      <style>{`
        @media (max-width: 639px) {
          #info-inputs { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Panel>
  )
}

function ChangePassword() {
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const schema = z.object({
    current_password: z.string().min(1, 'Current password required'),
    new_password:     z.string().min(6, 'Must be at least 6 characters'),
    confirm_password: z.string(),
  }).refine((d) => d.new_password === d.confirm_password, { message: "Passwords don't match", path: ['confirm_password'] })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await api.put('/member/change-password', data)
      toast.success('Account password updated!')
      reset()
    } catch (err) { toast.error(err?.response?.data?.error || 'Update failed') }
  }

  const fields = [
    { name: 'current_password', label: 'Current Password', key: 'current' },
    { name: 'new_password',     label: 'New Password',     key: 'new'     },
    { name: 'confirm_password', label: 'Confirm Password', key: 'confirm' },
  ]

  return (
    <Panel style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Update Password</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>Manage your platform access credentials</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {fields.map(({ name, label, key }) => (
          <div key={name}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input 
                {...register(name)} 
                type={show[key] ? 'text' : 'password'} 
                className="input" 
                style={{ paddingRight: '2.5rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}
              >
                {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors[name] && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors[name].message}</p>}
          </div>
        ))}
        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '0.5rem' }}>
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Update Password Now'}
        </button>
      </form>
    </Panel>
  )
}

function ChangePin() {
  const [show, setShow] = useState(false)
  const schema = z.object({
    new_pin:     z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'Digits only'),
    confirm_pin: z.string(),
  }).refine((d) => d.new_pin === d.confirm_pin, { message: "PINs don't match", path: ['confirm_pin'] })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await api.put('/member/transaction-pin', data)
      toast.success('Transaction PIN authorized!')
      reset()
    } catch (err) { toast.error(err?.response?.data?.error || 'Update failed') }
  }

  return (
    <Panel style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} style={{ color: 'var(--orange)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transaction PIN</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>Required for all asset liquidations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          Your 6-digit transaction PIN is a secondary security layer for all financial operations. 
          <br /><br />
          <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Forgot your PIN?</span> Since your security is our priority, you can set a new PIN below at any time. We recommend using a unique code different from your password.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
           <button type="button" onClick={() => setShow(!show)} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
             {show ? <><EyeOff size={14} /> HIDE CODES</> : <><Eye size={14} /> SHOW CODES</>}
           </button>
        </div>

        {[
          { name: 'new_pin',     label: 'New 6-Digit PIN' },
          { name: 'confirm_pin', label: 'Verify New PIN'        },
        ].map(({ name, label }) => (
          <div key={name}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</label>
            <input {...register(name)} type={show ? 'text' : 'password'} maxLength={6} className="input" style={{ letterSpacing: '0.5em', textAlign: 'center' }} placeholder="••••••" />
            {errors[name] && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors[name].message}</p>}
          </div>
        ))}
        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '0.5rem', background: 'var(--orange)', color: '#000' }}>
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Authorize PIN Update'}
        </button>
      </form>
    </Panel>
  )
}
