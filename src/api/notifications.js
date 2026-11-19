import api from './axios.js'

export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params })
  return response.data
}

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count')
  return response.data.unread_count
}

export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`)
  return response.data
}

export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all')
  return response.data
}

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`)
  return response.data
}

export const getConfigurations = async (grupo = 'notificaciones') => {
  const response = await api.get('/configurations', { params: { grupo } })
  return response.data.data
}

export const updateConfigurations = async (configurations) => {
  const response = await api.put('/configurations', { configurations })
  return response.data
}

export const triggerReminders = async () => {
  const response = await api.post('/configurations/trigger-reminders')
  return response.data
}
