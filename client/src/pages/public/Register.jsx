import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  TrendingUp, Eye, EyeOff, Loader2, User, Mail, Phone,
  Gift, Lock, Shield, ArrowRight, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'

const schema = z
  .object({
    name:             z.string().min(3, 'Full name must be at least 3 characters'),
    email:            z.string().email('Enter a valid email address'),
    phone:            z.string().min(7, 'Enter a valid phone number'),
    referral_code:    z.string().optional(),
    password:         z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

const PERKS = [
  'Daily ROI up to 1.2%',
  'Instant account activation',
  'Multi-level referral bonuses',
  '24/7 dedicated support',
]

export default function Register() {
  const [showPw, setShowPw] = useState(false)
  const [params]           = useSearchParams()
  const { register: registerUser, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { referral_code: params.get('ref') || '' },
  })

  const onSubmit = async (data) => {
    try {
      const { confirm_password, ...payload } = data
      const res = await registerUser(payload)
      toast.success(`Welcome, ${res.user.name}! Your ID is ${res.user_id}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Registration failed. Please try again.')
    }
  }

  const fields = [
    { name: 'name',          label: 'Full Name',      icon: User,  placeholder: 'John Doe',              type: 'text'  },
    { name: 'email',         label: 'Email Address',  icon: Mail,  placeholder: 'john@example.com',      type: 'email' },
    { name: 'phone',         label: 'Phone Number',   icon: Phone, placeholder: '+1 234 567 8900',       type: 'tel'   },
    { name: 'referral_code', label: 'Referral Code',  icon: Gift,  placeholder: 'Optional referral code', type: 'text', optional: true },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '6rem 1.25rem 3rem',
      position: 'relative',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 50% 50% at 30% 30%, rgba(124,58,237,0.12) 0%, transparent 65%)',
      }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
            <img src="/logo.svg" alt="Novatrix Logo" style={{ height: 50 }} />
          </Link>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: '0.375rem' }}>
            Create Your Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Start earning daily returns today
          </p>
        </div>

        {/* Perks row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.5rem',
        }}>
          {PERKS.map((perk) => (
            <div key={perk} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 9, padding: '0.5rem 0.75rem', fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}>
              <CheckCircle2 size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
              {perk}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--navy-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 18,
          padding: '2rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: 2, marginBottom: '1.75rem' }} />

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {/* Text fields */}
            {fields.map(({ name, label, icon: Icon, placeholder, type, optional }) => (
              <div key={name}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  {label} {optional && <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: '0.78rem' }}>(optional)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <Icon size={15} style={{
                    position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-faint)',
                  }} />
                  <input
                    {...register(name)}
                    type={type}
                    placeholder={placeholder}
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {errors[name] && (
                  <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                    {errors[name].message}
                  </p>
                )}
              </div>
            ))}

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  className="input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  {...register('confirm_password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {errors.confirm_password && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.confirm_password.message}</p>}
            </div>

            {/* Terms */}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              By registering you agree to our{' '}
              <Link to="/terms" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/disclaimer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>Risk Disclaimer</Link>.
            </p>

            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem' }}
            >
              {authLoading
                ? <Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} />
                : <><span>Create Account</span> <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
          <Shield size={13} style={{ color: 'var(--green)' }} />
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.775rem' }}>
            Secured with 256-bit SSL encryption
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
