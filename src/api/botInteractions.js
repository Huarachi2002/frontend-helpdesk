import api from './axios.js'

export const getBotInteractions = (params) => api.get('/bot-interactions', { params })
export const createBotInteraction = (data) => api.post('/bot-interactions', data)
