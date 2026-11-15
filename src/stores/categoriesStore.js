import { create } from 'zustand'
import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
} from '../api/categories.js'

export const useCategoriesStore = create((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { data } = await getCategories(params)
      const list = data.data ?? []
      set({ categories: list, loading: false })
      return list
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al cargar las categorías'
      set({ error: msg, loading: false })
      throw e
    }
  },

  saveCategory: async (categoryData) => {
    if (categoryData.id) {
      const { data } = await updateCategory(categoryData.id, categoryData)
      const current = get().categories
      const index = current.findIndex((c) => c.id === categoryData.id)
      if (index !== -1) {
        const next = [...current]
        next[index] = data.data
        set({ categories: next })
      }
      return data
    } else {
      const { data } = await createCategory(categoryData)
      set({ categories: [data.data, ...get().categories] })
      return data
    }
  },

  toggleStatus: async (id) => {
    const { data } = await toggleCategoryActive(id)
    const current = get().categories
    const index = current.findIndex((c) => c.id === id)
    if (index !== -1) {
      const next = [...current]
      next[index] = data.data
      set({ categories: next })
    }
    return data
  },

  removeCategory: async (id) => {
    const { data } = await deleteCategory(id)
    set({
      categories: get().categories.filter((c) => c.id !== id),
    })
    return data
  },
}))
