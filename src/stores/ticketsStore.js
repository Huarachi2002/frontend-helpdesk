import { create } from 'zustand'
import { getTickets, getTicket, updateStatus, reassignTicket } from '../api/tickets.js'

export const useTicketsStore = create((set, get) => ({
  tickets: [],
  ticket: null,
  pagination: null,
  loading: false,
  error: null,

  fetchTickets: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { data } = await getTickets(params)
      set({
        tickets: data.data || [],
        pagination: {
          current_page: data.meta?.current_page,
          last_page: data.meta?.last_page,
          per_page: data.meta?.per_page,
          total: data.meta?.total,
        },
        loading: false,
      })
    } catch (e) {
      set({
        error: e.response?.data?.message || 'Error al cargar tickets',
        loading: false,
      })
    }
  },

  fetchTicket: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await getTicket(id)
      set({
        ticket: data.data ?? data,
        loading: false,
      })
    } catch (e) {
      set({
        error: e.response?.data?.message || 'Error al cargar el ticket',
        loading: false,
      })
    }
  },

  changeStatus: async (id, status, comments = '') => {
    try {
      const { data } = await updateStatus(id, { status, comments })
      set({ ticket: data.data })
      return data
    } catch (e) {
      const responseData = e.response?.data ?? {}
      const enriched = new Error(responseData.message || 'Error al actualizar el estado')
      enriched.errorCode = responseData.error ?? null
      enriched.currentStatus = responseData.current_status ?? null
      enriched.targetStatus = responseData.target_status ?? null
      enriched.allowedTransitions = responseData.allowed_transitions ?? null
      enriched.httpStatus = e.response?.status ?? 500
      throw enriched
    }
  },

  reassign: async (id, assigned_to, comments = '') => {
    const { data } = await reassignTicket(id, { assigned_to, comments })
    set({ ticket: data.data })
    return data
  },
}))

export default useTicketsStore
