import { create } from 'zustand'
import {
  getPriorities,
  createPriority,
  updatePriority,
  togglePriorityActive,
  deletePriority,
} from '../api/priorities.js'

export const usePrioritiesStore = create((set, get) => ({
  priorities: [],
  loading: false,
  error: null,

  fetchPriorities: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { data } = await getPriorities(params)
      const list = data.data ?? []
      set({ priorities: list, loading: false })
      return list
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al cargar las prioridades'
      set({ error: msg, loading: false })
      throw e
    }
  },

  savePriority: async (priorityData) => {
    if (priorityData.id) {
      const { data } = await updatePriority(priorityData.id, priorityData)
      const current = get().priorities
      const index = current.findIndex((p) => p.id === priorityData.id)
      if (index !== -1) {
        const next = [...current]
        next[index] = data.data
        set({ priorities: next })
      }
      return data
    } else {
      const { data } = await createPriority(priorityData)
      set({ priorities: [data.data, ...get().priorities] })
      return data
    }
  },

  toggleStatus: async (id) => {
    const { data } = await togglePriorityActive(id)
    const current = get().priorities
    const index = current.findIndex((p) => p.id === id)
    if (index !== -1) {
      const next = [...current]
      next[index] = data.data
      set({ priorities: next })
    }
    return data
  },

  removePriority: async (id) => {
    const { data } = await deletePriority(id)
    set({
      priorities: get().priorities.filter((p) => p.id !== id),
    })
    return data
  },
}))

export default usePrioritiesStore
