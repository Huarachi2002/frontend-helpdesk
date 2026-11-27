import api from './axios.js'

/**
 * Registra una visita global a la ruta especificada y retorna los contadores actualizados.
 * @param {string} ruta Ruta normalizada (ej. '/dashboard', '/tickets', '/login')
 * @param {string} [titulo] Título descriptivo de la vista
 */
export async function trackPageVisit(ruta, titulo = '') {
  const { data } = await api.post('/page-visits/track', {
    ruta,
    titulo: titulo || undefined,
  })
  return data
}

/**
 * Consulta el contador global de una ruta sin incrementar.
 * @param {string} [ruta]
 */
export async function getPageVisits(ruta) {
  const params = ruta ? { ruta } : {}
  const { data } = await api.get('/page-visits', { params })
  return data
}
