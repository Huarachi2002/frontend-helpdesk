import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api/auth.js'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(null)
  const token = ref(localStorage.getItem('auth_token') || null)

  const isAuthenticated = computed(() => !!token.value)

  async function loginUser(credentials) {
    const { data } = await apiLogin(credentials)
    token.value = data.access_token
    user.value  = data.user
    localStorage.setItem('auth_token', data.access_token)
  }

  async function fetchUser() {
    const { data } = await apiMe()
    user.value = data
  }

  async function logoutUser() {
    try { await apiLogout() } catch (_) { /* ignorar si falla */ }
    token.value = null
    user.value  = null
    localStorage.removeItem('auth_token')
  }

  return { user, token, isAuthenticated, loginUser, fetchUser, logoutUser }
})
