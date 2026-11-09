import api from './axios.js'

export const getTickets  = (params) => api.get('/tickets', { params })
export const getTicket   = (id)     => api.get(`/tickets/${id}`)
export const createTicket = (data)  => api.post('/tickets', data)
export const updateStatus = (id, data) => api.patch(`/tickets/${id}/status`, data)
export const reassignTicket = (id, data) => api.patch(`/tickets/${id}/assign`, data)
