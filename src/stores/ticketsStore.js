import { create } from 'zustand'
import {
  getTickets,
  getTicket,
  createTicket,
  updateStatus,
  replyTicket as apiReplyTicket,
  reassignTicket,
  approveReassignment as apiApproveReassignment,
  rejectReassignment as apiRejectReassignment,
  getEscalationOptions,
  escalateTicket,
  returnTicket,
} from '../api/tickets.js'

// Normaliza errores de la API (validación 422 o reglas de negocio) en un Error con mensaje legible
function toEnrichedError(e, fallback) {
  const responseData = e.response?.data ?? {}
  const validation = responseData.errors ? Object.values(responseData.errors).flat()[0] : null
  const enriched = new Error(validation || responseData.message || fallback)
  enriched.errorCode = responseData.error ?? null
  enriched.httpStatus = e.response?.status ?? 500
  return enriched
}

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
          current_page: data.meta?.current_page ?? data.current_page,
          last_page: data.meta?.last_page ?? data.last_page,
          per_page: data.meta?.per_page ?? data.per_page,
          total: data.meta?.total ?? data.total,
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

  createNewTicket: async (ticketData) => {
    const { data } = await createTicket(ticketData)
    const created = data.data ?? data
    set((state) => ({
      tickets: [created, ...state.tickets],
      pagination: state.pagination
        ? { ...state.pagination, total: (state.pagination.total || 0) + 1 }
        : null,
    }))
    return data
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

  replyTicket: async (id, mensaje, nextStatus = null) => {
    try {
      const payload = { mensaje }
      if (nextStatus) payload.next_status = nextStatus
      const { data } = await apiReplyTicket(id, payload)
      if (data.data) {
        set({ ticket: data.data })
      }
      return data
    } catch (e) {
      const responseData = e.response?.data ?? {}
      const validation = responseData.errors ? Object.values(responseData.errors).flat()[0] : null
      const enriched = new Error(validation || responseData.message || 'Error al enviar la respuesta')
      enriched.errorCode = responseData.error ?? null
      enriched.allowedTransitions = responseData.allowed_transitions ?? null
      enriched.httpStatus = e.response?.status ?? 500
      throw enriched
    }
  },

  reassign: async (id, assigned_to, comments = '') => {
    try {
      const { data } = await reassignTicket(id, { assigned_to, comments, motivo: comments })
      if (data.data) {
        set({ ticket: data.data })
      }
      return data
    } catch (e) {
      const message = e.response?.data?.message || 'Error al procesar la reasignación'
      const enriched = new Error(message)
      enriched.errorCode = e.response?.data?.error
      throw enriched
    }
  },

  approveReassignment: async (ticketId, requestId, comments = '') => {
    try {
      const { data } = await apiApproveReassignment(ticketId, requestId, { comments, motivo: comments })
      if (data.data) {
        set({ ticket: data.data })
      }
      return data
    } catch (e) {
      const message = e.response?.data?.message || 'Error al aprobar la reasignación'
      const enriched = new Error(message)
      enriched.errorCode = e.response?.data?.error
      throw enriched
    }
  },

  rejectReassignment: async (ticketId, requestId, comments = '') => {
    try {
      const { data } = await apiRejectReassignment(ticketId, requestId, { comments, reason: comments, motivo: comments })
      if (data.data) {
        set({ ticket: data.data })
      }
      return data
    } catch (e) {
      const message = e.response?.data?.message || 'Error al rechazar la solicitud de reasignación'
      const enriched = new Error(message)
      enriched.errorCode = e.response?.data?.error
      throw enriched
    }
  },

  // --- Relevamiento ---

  fetchEscalationOptions: async (ticketId) => {
    try {
      const { data } = await getEscalationOptions(ticketId)
      return data.data
    } catch (e) {
      throw toEnrichedError(e, 'No se pudieron cargar las opciones de relevamiento')
    }
  },

  escalate: async (ticketId, destinoUsuarioId, motivo) => {
    try {
      const { data } = await escalateTicket(ticketId, { destino_usuario_id: destinoUsuarioId, motivo })
      if (data.data) set({ ticket: data.data })
      return data
    } catch (e) {
      throw toEnrichedError(e, 'Error al relevar el ticket')
    }
  },

  returnToPrevious: async (ticketId, instrucciones, destinoUsuarioId = null) => {
    try {
      const payload = { instrucciones }
      if (destinoUsuarioId) payload.destino_usuario_id = destinoUsuarioId
      const { data } = await returnTicket(ticketId, payload)
      if (data.data) set({ ticket: data.data })
      return data
    } catch (e) {
      throw toEnrichedError(e, 'Error al devolver el ticket')
    }
  },
}))

export default useTicketsStore
