import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api/auth.js'

const initialToken = localStorage.getItem('auth_token') || null

export const useAuthStore = create((set, get) => ({
  user: null,
  token: initialToken,
  isAuthenticated: !!initialToken,

  loginUser: async (credentials) => {
    const { data } = await apiLogin(credentials)
    const token = data.access_token
    localStorage.setItem('auth_token', token)
    set({ token, user: data.user, isAuthenticated: true })
    return data
  },

  fetchUser: async () => {
    const { data } = await apiMe()
    set({ user: data, isAuthenticated: true })
    return data
  },

  logoutUser: async () => {
    try {
      await apiLogout()
    } catch (_) {
      // Ignorar errores al desloguear
    }
    localStorage.removeItem('auth_token')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))

export default useAuthStore

