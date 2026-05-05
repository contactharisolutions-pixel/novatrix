import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  TrendingUp, Eye, EyeOff, Loader2, User, Mail, Phone,
  Gift, Lock, Shield, ArrowRight, CheckCircle2,
  Copy, X, BadgeCheck, Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore, { siteOrigin } from '../../store/useAuthStore'
import api from '../../lib/api'

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
  'Daily ROI 0.5%, 1.0% & 2.0%',
  'Instant account activation',
  'Multi-level referral bonuses',
  '24/7 dedicated support',
]

/* ── Success Modal ─────────────────────────────────────────────────────────── */
function SuccessModal({ data, onClose }) {
  const [copied, setCopied] = useState(null)

  const copy = (text, field) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(field)
        toast.success('Copied!')
        setTimeout(() => setCopied(null), 2000)
      })
      .catch(() => toast.error('Copy failed'))
  }

  const shareReferral = async () => {
    const link = `${siteOrigin()}/register?ref=${data.refCode}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Novatrix',
          text: `Join me on Novatrix and start earning daily returns! Use my referral code: ${data.refCode}`,
          url: link,
        })
      } catch (e) {
        if (e.name !== 'AbortError') toast.error('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(link).then(() => toast.success('Referral link copied!'))
    }
  }

  const rows = [
    { label: 'Full Name',     value: data.name,       field: 'name'  },
    { label: 'User ID',       value: data.user_id,    field: 'uid'   },
    { label: 'Email',         value: data.email,      field: 'email' },
    { label: 'Phone',         value: data.phone,      field: 'phone' },
    { label: 'Referral Code', value: data.sponsor_id, field: 'ref'   },
    { label: 'Password',      value: data.password,   field: 'pw', sensitive: true },
  ]

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--navy-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 20,
          width: '100%', maxWidth: 460,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header gradient bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, var(--cyan), var(--purple))' }} />

        {/* Header */}
        <div style={{ padding: '1.75rem 1.75rem 0', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.25rem', right: '1.25rem',
              background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-light)',
              borderRadius: 8, padding: '0.3rem', cursor: 'pointer',
              color: 'var(--text-faint)', display: 'flex',
            }}
          >
            <X size={16} />
          </button>

          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%', margin: '0 auto 0.875rem',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
              border: '2px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BadgeCheck size={30} style={{ color: 'var(--green)' }} />
            </div>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700,
              marginBottom: '0.3rem',
            }}>
              Account Created Successfully!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', lineHeight: 1.5 }}>
              Save your login credentials securely.<br />
              You will need them to access your account.
            </p>
          </div>
        </div>

        {/* Details table */}
        <div style={{ padding: '0 1.75rem 1.75rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-light)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {rows.map(({ label, value, field, sensitive }, i) => (
              <div
                key={field}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 1rem',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                  gap: '0.5rem',
                  background: sensitive ? 'rgba(124,58,237,0.05)' : 'transparent',
                }}
              >
                <div style={{ minWidth: 110 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 500 }}>
                    {label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: sensitive ? 700 : 600,
                    color: sensitive ? 'var(--cyan)' : 'var(--text-primary)',
                    fontFamily: sensitive ? 'monospace' : 'inherit',
                    wordBreak: 'break-all', textAlign: 'right',
                  }}>
                    {value || '—'}
                  </span>
                  <button
                    onClick={() => copy(value, field)}
                    title="Copy"
                    style={{
                      background: copied === field ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${copied === field ? 'rgba(16,185,129,0.4)' : 'var(--border-light)'}`,
                      borderRadius: 6, padding: '0.25rem', cursor: 'pointer',
                      color: copied === field ? 'var(--green)' : 'var(--text-faint)',
                      display: 'flex', flexShrink: 0, transition: 'all 0.2s',
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Warning note */}
          <div style={{
            marginTop: '1rem',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, padding: '0.65rem 0.9rem',
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}>
            <Shield size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.775rem', color: '#f59e0b', lineHeight: 1.55, margin: 0 }}>
              Please save your password now. For security reasons, it will not be shown again.
            </p>
          </div>

          {/* CTA row: Share + Go to Dashboard */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              onClick={shareReferral}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.875rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Share2 size={16} />
              <span>Share My Link</span>
            </button>
            <button
              onClick={onClose}
              className="btn-primary"
              style={{ flex: 1, padding: '0.875rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <span>Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}

/* ── Register Page ─────────────────────────────────────────────────────────── */
export default function Register() {
  const [showPw, setShowPw]           = useState(false)
  const [successData, setSuccessData] = useState(null) // holds modal data
  const [params]                      = useSearchParams()
  const { register: registerUser, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { referral_code: params.get('ref') || '' },
  })

  const [sponsorName, setSponsorName] = useState('')
  const referralCode = watch('referral_code')

  useEffect(() => {
    const fetchSponsor = async () => {
      if (!referralCode || referralCode.length < 3) {
        setSponsorName('')
        return
      }
      try {
        const { data } = await api.get(`/public/sponsor/${referralCode}`)
        setSponsorName(data.name)
      } catch (err) {
        setSponsorName('')
      }
    }
    const timer = setTimeout(fetchSponsor, 500) // debounce
    return () => clearTimeout(timer)
  }, [referralCode])

  const onSubmit = async (data) => {
    try {
      const { confirm_password, ...payload } = data
      const res = await registerUser(payload)

      // Show the success popup with all details + plain-text password
      // refCode comes from the server response (res.user.referral_code) — not computed client-side
      setSuccessData({
        name:       res.user.name,
        user_id:    res.user_id,
        email:      data.email,
        phone:      data.phone,
        sponsor_id: data.referral_code || 'Direct',
        refCode:    res.user.referral_code?.replace('NVX', '') || `${res.user_id}`,
        password:   data.password,
      })
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Registration failed. Please try again.')
    }
  }

  const handleModalClose = () => {
    setSuccessData(null)
    navigate('/dashboard')
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
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  <span>
                    {label} {optional && <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: '0.78rem' }}>(optional)</span>}
                  </span>
                  {name === 'referral_code' && sponsorName && (
                    <span style={{ color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, animation: 'fadeIn 0.3s ease' }}>
                      Member: {sponsorName}
                    </span>
                  )}
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

      {/* Success Modal */}
      {successData && <SuccessModal data={successData} onClose={handleModalClose} />}
    </div>
  )
}
