import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserActive,
  deleteUser,
  getCategories,
} from '../api/users.js'

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const pagination = ref(null)
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers(params = {}) {
    loading.value = true
    error.value = null
    try {
      const { data } = await getUsers(params)
      users.value = data.data
      pagination.value = {
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total,
      }
    } catch (e) {
      error.value = e.response?.data?.message || 'Error al cargar usuarios'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      const { data } = await getCategories()
      categories.value = data.data ?? []
    } catch (e) {
      console.error('Error al cargar categorías:', e)
    }
  }

  async function saveUser(userData) {
    if (userData.id) {
      const { data } = await updateUser(userData.id, userData)
      const index = users.value.findIndex((u) => u.id === userData.id)
      if (index !== -1) {
        users.value[index] = data.data
      }
      return data
    } else {
      const { data } = await createUser(userData)
      users.value.unshift(data.data)
      return data
    }
  }

  async function toggleStatus(id) {
    const { data } = await toggleUserActive(id)
    const index = users.value.findIndex((u) => u.id === id)
    if (index !== -1) {
      users.value[index] = data.data
    }
    return data
  }

  async function deleteUserRecord(id) {
    const { data } = await deleteUser(id)
    users.value = users.value.filter((u) => u.id !== id)
    return data
  }

  return {
    users,
    pagination,
    categories,
    loading,
    error,
    fetchUsers,
    fetchCategories,
    saveUser,
    toggleStatus,
    deleteUserRecord,
  }
})
