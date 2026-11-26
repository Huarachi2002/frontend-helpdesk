import api from './axios.js'

export const getVolumeReport = (params) => api.get('/reports/volume', { params })
export const getImpactReport = (params) => api.get('/reports/impact', { params })
export const getTimesReport  = (params) => api.get('/reports/times',  { params })

export const exportReport = (format, params = {}) =>
  api.get('/reports/export', {
    params: { format, ...params },
    responseType: 'blob',
  })


export const getDashboardReport = () => {
  return api.get('/reports/dashboard')
}

// --- Reporte de Métricas FRT / MTTR (Administrador y Soporte Técnico) ---
// params: { date_from, date_to, level: 'general'|'technician'|'category', technician_id?, category_id? }
export const getMetricsOptions = () => api.get('/reports/metrics/options')
export const getMetricsReport = (params) => api.get('/reports/metrics', { params })
export const exportMetricsReport = (format, params = {}) =>
  api.get('/reports/metrics/export', {
    params: { format, ...params },
    responseType: 'blob',
  })
