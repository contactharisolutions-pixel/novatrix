import { create } from 'zustand'
import api from '../lib/api'

/** Canonical site origin — use VITE_SITE_URL in prod; fall back to window.location.origin in dev */
export const siteOrigin = () =>
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') || window.location.origin

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('nvx_user') || 'null'),
  token:   localStorage.getItem('nvx_token') || null,
  loading: false,

  /** Login: stores token, refresh, and user in localStorage */
  login: async (user_id, password) => {
    set({ loading: true })
    const { data } = await api.post('/auth/login', { user_id, password })
    localStorage.setItem('nvx_token',   data.token)
    localStorage.setItem('nvx_refresh', data.refresh)
    localStorage.setItem('nvx_user',    JSON.stringify(data.user))
    set({ user: data.user, token: data.token, loading: false })
    return data
  },

  /** Register: auto-login after success */
  register: async (payload) => {
    set({ loading: true })
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('nvx_token',   data.token)
    localStorage.setItem('nvx_refresh', data.refresh)
    localStorage.setItem('nvx_user',    JSON.stringify(data.user))
    set({ user: data.user, token: data.token, loading: false })
    return data
  },

  /** Refresh user data from server (includes wallet balances) */
  refreshUser: async () => {
    try {
      const { data } = await api.get('/member/dashboard')
      const updatedUser = { ...get().user, ...data.user,
        fund_wallet_balance:   data.user.fund_wallet_balance,
        income_wallet_balance: data.user.income_wallet_balance,
      }
      localStorage.setItem('nvx_user', JSON.stringify(updatedUser))
      set({ user: updatedUser })
    } catch (err) {
      console.error('Failed to refresh user data', err)
    }
  },

  /** Logout: clear all stored state */
  logout: () => {
    localStorage.removeItem('nvx_token')
    localStorage.removeItem('nvx_refresh')
    localStorage.removeItem('nvx_user')
    localStorage.removeItem('nvx_impersonator')
    localStorage.removeItem('nvx_admin_backup_session')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  /** Administrative Impersonation */
  impersonate: (data) => {
    // Admin session is persisted by Zustand under 'nvx_admin_session' key.
    // We back it up so we can fully restore it when exiting impersonation.
    const adminSession = localStorage.getItem('nvx_admin_session')
    if (adminSession) localStorage.setItem('nvx_admin_backup_session', adminSession)

    // Write member credentials into the member auth keys
    localStorage.setItem('nvx_token',        data.token)
    localStorage.setItem('nvx_refresh',      data.refresh)
    localStorage.setItem('nvx_user',         JSON.stringify(data.user))
    localStorage.setItem('nvx_impersonator', 'true')
    set({ user: data.user, token: data.token })
    window.location.href = '/dashboard'
  },

  isAuthenticated: () => !!get().token,
  isImpersonating: () => localStorage.getItem('nvx_impersonator') === 'true',
}))

export default useAuthStore
