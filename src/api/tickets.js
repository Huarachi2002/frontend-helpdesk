import api from './axios.js'

export const getTickets              = (params) => api.get('/tickets', { params })
export const getTicket               = (id)     => api.get(`/tickets/${id}`)
export const createTicket            = (data)   => api.post('/tickets', data)
export const updateStatus            = (id, data) => api.patch(`/tickets/${id}/status`, data)
export const getTicketMessages       = (id)     => api.get(`/tickets/${id}/messages`)
export const replyTicket             = (id, data) => api.post(`/tickets/${id}/messages`, data)
export const reassignTicket          = (id, data) => api.patch(`/tickets/${id}/assign`, data)
export const getEligibleAgents       = (ticketId) => api.get(`/tickets/${ticketId}/eligible-agents`)
export const approveReassignment     = (ticketId, requestId, data) => api.post(`/tickets/${ticketId}/reassignments/${requestId}/approve`, data)
export const rejectReassignment      = (ticketId, requestId, data) => api.post(`/tickets/${ticketId}/reassignments/${requestId}/reject`, data)
export const getPendingReassignments = () => api.get('/tickets/reassignments/pending')
