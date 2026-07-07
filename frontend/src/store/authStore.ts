import { create } from 'zustand'
import { authAPI } from '../services/api'

interface AuthState {
  token: string | null
  admin: { id: string; username: string; role: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  admin: null,
  isAuthenticated: !!localStorage.getItem('admin_token'),
  isLoading: true,

  login: async (username: string, password: string) => {
    const res = await authAPI.login(username, password)
    const { access_token } = res.data
    localStorage.setItem('admin_token', access_token)
    set({ token: access_token, isAuthenticated: true })
    const me = await authAPI.me()
    set({ admin: me.data })
  },

  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null, admin: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        const me = await authAPI.me()
        set({ admin: me.data, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      localStorage.removeItem('admin_token')
      set({ admin: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
