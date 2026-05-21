import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const getAdminBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL}/api/admin`;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://novatrix-server.vercel.app/api/admin';
  }
  return '/api/admin';
}

const adminApi = axios.create({
  baseURL: getAdminBaseUrl()
})

const useAdminStore = create(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data } = await adminApi.post('/auth/login', { email, password })
          set({ token: data.token, admin: data.admin })
          adminApi.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        } finally {
          set({ loading: false })
        }
      },

      logout: () => {
        set({ token: null, admin: null })
        delete adminApi.defaults.headers.common['Authorization']
        window.location.href = '/admin/login'
      },

      hydrate: () => {
        const token = get().token
        if (token) adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },
    }),
    {
      name:    'nvx_admin_session',
      partialize: (s) => ({ token: s.token, admin: s.admin }),
      onRehydrateStorage: () => (state) => state?.hydrate?.(),
    }
  )
)

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAdminStore.getState().logout()
    }
    return Promise.reject(err)
  }
)

export { adminApi }
export default useAdminStore
