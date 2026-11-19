import api from './axios.js'

export const getPriorities = (params) => api.get('/priorities', { params })
export const getPriority = (id) => api.get(`/priorities/${id}`)
export const createPriority = (data) => api.post('/priorities', data)
export const updatePriority = (id, data) => api.put(`/priorities/${id}`, data)
export const togglePriorityActive = (id) => api.patch(`/priorities/${id}/toggle-active`)
export const deletePriority = (id) => api.delete(`/priorities/${id}`)
