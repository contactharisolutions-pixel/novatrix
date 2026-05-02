import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, Eye, EyeOff, Loader2, Lock, User, Shield, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'

const schema = z.object({
  user_id:  z.string().min(4, 'Enter your User ID'),
  password: z.string().min(1, 'Enter your password'),
})

export default function Login() {
  const [showPw, setShowPw] = useState(false)
  const { login, loading }  = useAuthStore()
  const navigate             = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      await login(data.user_id, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6rem 1.25rem 3rem',
      position: 'relative',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 45% 45% at 50% 30%, rgba(0,212,255,0.08) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, right: 0, width: 600, height: 600, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <img src="/logo.svg" alt="Novatrix Logo" style={{ height: 50 }} />
          </Link>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: '0.375rem' }}>
            Member Login
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Access your investment dashboard securely
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--navy-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 18,
          padding: '2rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          {/* Top accent */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: 2, marginBottom: '1.75rem' }} />

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* User ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                User ID
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-faint)',
                }} />
                <input
                  {...register('user_id')}
                  placeholder="Enter your User ID"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  autoComplete="username"
                />
              </div>
              {errors.user_id && (
                <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                  {errors.user_id.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                <button
                  type="button"
                  style={{ fontSize: '0.78rem', color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-faint)',
                }} />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-faint)', display: 'flex', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', marginTop: '0.5rem' }}
            >
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 0.75s linear infinite' }} />
                : <><span>Sign In</span> <ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Footer link */}
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1.5rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'none' }}>
              Register Now
            </Link>
          </p>
        </div>

        {/* SSL note */}
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
