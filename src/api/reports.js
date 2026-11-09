import api from './axios.js'

export const getVolumeReport = (params) => api.get('/reports/volume', { params })
export const getImpactReport = (params) => api.get('/reports/impact', { params })
export const getTimesReport  = (params) => api.get('/reports/times',  { params })

export const exportReport = (format, params = {}) =>
  api.get('/reports/export', {
    params: { format, ...params },
    responseType: 'blob',
  })
