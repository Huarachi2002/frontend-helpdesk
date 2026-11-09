import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTickets, getTicket, updateStatus, reassignTicket } from '../api/tickets.js'

export const useTicketsStore = defineStore('tickets', () => {
  const tickets    = ref([])
  const ticket     = ref(null)
  const pagination = ref(null)
  const loading    = ref(false)
  const error      = ref(null)

  async function fetchTickets(params = {}) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await getTickets(params)
      tickets.value    = data.data
      pagination.value = {
        current_page: data.meta?.current_page,
        last_page:    data.meta?.last_page,
        per_page:     data.meta?.per_page,
        total:        data.meta?.total,
      }
    } catch (e) {
      error.value = e.response?.data?.message || 'Error al cargar tickets'
    } finally {
      loading.value = false
    }
  }

  async function fetchTicket(id) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await getTicket(id)
      ticket.value = data.data ?? data
    } catch (e) {
      error.value = e.response?.data?.message || 'Error al cargar el ticket'
    } finally {
      loading.value = false
    }
  }

  async function changeStatus(id, status, comments = '') {
    try {
      const { data } = await updateStatus(id, { status, comments })
      ticket.value = data.data
    } catch (e) {
      // Re-lanzar el error enriquecido con la info del State Pattern
      // para que la vista pueda mostrar mensajes específicos
      const responseData = e.response?.data ?? {}
      const enriched = new Error(responseData.message || 'Error al actualizar el estado')
      enriched.errorCode         = responseData.error ?? null
      enriched.currentStatus     = responseData.current_status ?? null
      enriched.targetStatus      = responseData.target_status ?? null
      enriched.allowedTransitions = responseData.allowed_transitions ?? null
      enriched.httpStatus        = e.response?.status ?? 500
      throw enriched
    }
  }

  async function reassign(id, assigned_to, comments = '') {
    const { data } = await reassignTicket(id, { assigned_to, comments })
    ticket.value = data.data
  }

  return { tickets, ticket, pagination, loading, error, fetchTickets, fetchTicket, changeStatus, reassign }
})
