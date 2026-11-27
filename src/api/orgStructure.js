import api from './axios.js'

// Cargos de la estructura organizacional (PK = código institucional)
export const getCargos = () => api.get('/org/cargos')
export const createCargo = (data) => api.post('/org/cargos', data)
export const updateCargo = (codigo, data) => api.put(`/org/cargos/${encodeURIComponent(codigo)}`, data)
export const toggleCargoActive = (codigo) => api.patch(`/org/cargos/${encodeURIComponent(codigo)}/toggle-active`)
export const deleteCargo = (codigo) => api.delete(`/org/cargos/${encodeURIComponent(codigo)}`)

// Personal (Directores y Técnicos) y su cargo
export const getPersonal = () => api.get('/org/personal')
export const assignPersonalCargo = (userId, cargoCodigo) =>
  api.patch(`/org/personal/${userId}/cargo`, { cargo_codigo: cargoCodigo })
