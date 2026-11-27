import { create } from 'zustand'
import {
  getCargos,
  createCargo,
  updateCargo,
  toggleCargoActive,
  deleteCargo,
  getPersonal,
  assignPersonalCargo,
} from '../api/orgStructure.js'

/**
 * Estado global de la Estructura Organizacional (cargos del organigrama y personal asignado).
 */
export const useOrgStructureStore = create((set, get) => ({
  cargos: [],
  personal: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const [cargosRes, personalRes] = await Promise.all([getCargos(), getPersonal()])
      set({
        cargos: cargosRes.data.data ?? [],
        personal: personalRes.data.data ?? [],
        loading: false,
      })
    } catch (e) {
      set({
        error: e.response?.data?.message || 'Error al cargar la estructura organizacional',
        loading: false,
      })
      throw e
    }
  },

  fetchCargos: async () => {
    const { data } = await getCargos()
    set({ cargos: data.data ?? [] })
    return data.data
  },

  /**
   * Crea o actualiza un cargo. `originalCodigo` identifica al cargo en edición
   * (el código puede cambiar porque es editable).
   */
  saveCargo: async (cargoData, originalCodigo = null) => {
    const res = originalCodigo
      ? await updateCargo(originalCodigo, cargoData)
      : await createCargo(cargoData)
    // Un cambio de superior o de código afecta a otros nodos: se recarga todo.
    await get().fetchAll()
    return res.data
  },

  toggleCargo: async (codigo) => {
    const { data } = await toggleCargoActive(codigo)
    await get().fetchCargos()
    return data
  },

  removeCargo: async (codigo) => {
    const { data } = await deleteCargo(codigo)
    set({ cargos: get().cargos.filter((c) => c.codigo !== codigo) })
    return data
  },

  assignCargo: async (userId, cargoCodigo) => {
    const { data } = await assignPersonalCargo(userId, cargoCodigo)
    set({
      personal: get().personal.map((p) => (p.id === userId ? data.data : p)),
    })
    await get().fetchCargos()
    return data
  },
}))
