import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

/** Axios instance — all requests go to the backend API */
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nvx_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('nvx_refresh')
        // Must use full BASE_URL here — relative path fails when client & server are on different domains
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh })
        localStorage.setItem('nvx_token', data.token)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        // If impersonating, restore admin session instead of sending to /login
        if (localStorage.getItem('nvx_impersonator') === 'true') {
          const adminSession = localStorage.getItem('nvx_admin_backup_session')
          if (adminSession) localStorage.setItem('nvx_admin_session', adminSession)
          localStorage.removeItem('nvx_token')
          localStorage.removeItem('nvx_refresh')
          localStorage.removeItem('nvx_user')
          localStorage.removeItem('nvx_admin_backup_session')
          localStorage.removeItem('nvx_impersonator')
          window.location.href = '/admin/members'
        } else {
          localStorage.removeItem('nvx_token')
          localStorage.removeItem('nvx_refresh')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
