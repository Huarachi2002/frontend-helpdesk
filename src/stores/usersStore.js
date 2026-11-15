import { create } from 'zustand'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserActive,
  deleteUser,
  getCategories,
} from '../api/users.js'

export const useUsersStore = create((set, get) => ({
  users: [],
  pagination: null,
  categories: [],
  loading: false,
  error: null,

  fetchUsers: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { data } = await getUsers(params)
      set({
        users: data.data || [],
        pagination: {
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page,
          total: data.total,
        },
        loading: false,
      })
      return data
    } catch (e) {
      set({
        error: e.response?.data?.message || 'Error al cargar usuarios',
        loading: false,
      })
      throw e
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await getCategories({ all: true })
      set({ categories: data.data ?? [] })
      return data
    } catch (e) {
      console.error('Error al cargar categorías:', e)
    }
  },

  saveUser: async (userData) => {
    if (userData.id) {
      const { data } = await updateUser(userData.id, userData)
      const currentUsers = get().users
      const index = currentUsers.findIndex((u) => u.id === userData.id)
      if (index !== -1) {
        const nextUsers = [...currentUsers]
        nextUsers[index] = data.data
        set({ users: nextUsers })
      }
      return data
    } else {
      const { data } = await createUser(userData)
      set({ users: [data.data, ...get().users] })
      return data
    }
  },

  toggleStatus: async (id) => {
    const { data } = await toggleUserActive(id)
    const currentUsers = get().users
    const index = currentUsers.findIndex((u) => u.id === id)
    if (index !== -1) {
      const nextUsers = [...currentUsers]
      nextUsers[index] = data.data
      set({ users: nextUsers })
    }
    return data
  },

  deleteUserRecord: async (id) => {
    const { data } = await deleteUser(id)
    set({ users: get().users.filter((u) => u.id !== id) })
    return data
  },
}))

export default useUsersStore

