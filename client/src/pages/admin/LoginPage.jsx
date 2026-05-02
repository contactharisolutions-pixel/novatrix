import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, Eye, EyeOff, Loader2, Shield, Mail, Lock, ArrowRight, ShieldAlert, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'
import useAdminStore from '../../store/useAdminStore'

const schema = z.object({
  email:    z.string().email('Enter a valid administrative email'),
  password: z.string().min(1, 'Access key required'),
})

export default function AdminLogin() {
  const [showPw, setShowPw] = useState(false)
  const { login, loading }  = useAdminStore()
  const navigate             = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password)
      toast.success('Administrative session established.')
      navigate('/admin')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Authorization failed. Invalid credentials.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem',
      background: 'var(--navy-bg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 60% at 50% 30%, rgba(249,115,22,0.06) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--orange), var(--red))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(249,115,22,0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <Cpu size={28} color="#fff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                NOVATRIX
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Command Center
              </p>
            </div>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            System Authorization
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', fontWeight: 500 }}>
            Restricted access protocol — level 10 clearance required
          </p>
        </div>

        {/* Security Warning */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center',
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', marginBottom: '2rem',
          fontSize: '0.8125rem', color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em'
        }} className="scale-in">
          <ShieldAlert size={16} />
          Unauthorized access attempts are logged
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-lg)',
        }} className="scale-in">
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--orange), var(--red))', borderRadius: '4px 4px 0 0' }} />

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Administrative Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1.125rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@novatrix.system"
                  className="input"
                  style={{ paddingLeft: '3rem', height: 52, fontSize: '0.9375rem' }}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p style={{ color: 'var(--red)', fontSize: '0.75rem', fontWeight: 600 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Access Key
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1.125rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="input"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem', height: 52, fontSize: '0.9375rem', letterSpacing: '0.1em' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '1.125rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p style={{ color: 'var(--red)', fontSize: '0.75rem', fontWeight: 600 }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%', height: 56, marginTop: '0.5rem', fontSize: '1rem',
                background: 'linear-gradient(135deg, var(--orange), var(--red))',
                borderColor: 'transparent', boxShadow: '0 8px 30px rgba(249,115,22,0.2)'
              }}
            >
              {loading
                ? <Loader2 size={24} className="animate-spin" />
                : <><Shield size={20} /> <span>Initialize Authorization</span></>
              }
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--text-faint)', textDecoration: 'none', fontWeight: 600, transition: 'var(--transition-normal)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateX(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.transform = 'none' }}
          >
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Return to Public Ecosystem
          </Link>
        </div>
      </div>
    </div>
  )
}
