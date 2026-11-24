import api from './axios.js'

export const getAuditLogs = (params = {}) => {
  return api.get('/audit-logs', { params })
}

export const getAuditStats = () => {
  return api.get('/audit-logs/stats')
}
