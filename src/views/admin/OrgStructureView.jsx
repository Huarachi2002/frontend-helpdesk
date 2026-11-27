import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  IconSitemap,
  IconPlus,
  IconSearch,
  IconX,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconUsers,
  IconUserOff,
  IconToggleLeft,
  IconToggleRight,
  IconBriefcase,
  IconBuildingCommunity,
  IconUserCheck,
  IconTable,
} from '@tabler/icons-react'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { OrganizationChart } from 'primereact/organizationchart'
import { confirmDialog } from 'primereact/confirmdialog'
import { useOrgStructureStore } from '../../stores/orgStructureStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import { cargoSchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import './CategoriesManagementView.css'
import './OrgStructureView.css'

const NEW_SECTION = '__nueva__'

export const nivelLabel = (nivel) => `Nivel ${nivel}`

const SECTION_TONES = ['blue', 'purple', 'emerald', 'amber', 'rose']

const defaultForm = {
  codigo: '',
  nombre: '',
  seccion: '',
  cargo_superior_codigo: '',
  dependencia_externa: '',
  orden: 0,
  activo: true,
}

const TABS = [
  { id: 'chart', label: 'Organigrama', icon: IconSitemap },
  { id: 'cargos', label: 'Cargos', icon: IconTable },
  { id: 'personal', label: 'Asignación de Personal', icon: IconUserCheck },
]

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default function OrgStructureView() {
  const cargos = useOrgStructureStore((s) => s.cargos)
  const personal = useOrgStructureStore((s) => s.personal)
  const loading = useOrgStructureStore((s) => s.loading)
  const error = useOrgStructureStore((s) => s.error)
  const fetchAll = useOrgStructureStore((s) => s.fetchAll)
  const saveCargo = useOrgStructureStore((s) => s.saveCargo)
  const toggleCargo = useOrgStructureStore((s) => s.toggleCargo)
  const removeCargo = useOrgStructureStore((s) => s.removeCargo)
  const assignCargo = useOrgStructureStore((s) => s.assignCargo)

  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('chart')
  const [search, setSearch] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [savingUserId, setSavingUserId] = useState(null)

  // Modal de cargo
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCodigo, setEditingCodigo] = useState(null)
  const [formData, setFormData] = useState({ ...defaultForm })
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [seccionNueva, setSeccionNueva] = useState(false)

  const loadData = useCallback(() => {
    fetchAll().catch(() => {})
  }, [fetchAll])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Derivados ---

  const cargoByCodigo = useMemo(
    () => Object.fromEntries(cargos.map((c) => [c.codigo, c])),
    [cargos]
  )

  const sectionTone = useMemo(() => {
    const map = {}
    cargos.forEach((c) => {
      if (!(c.seccion in map)) {
        map[c.seccion] = SECTION_TONES[Object.keys(map).length % SECTION_TONES.length]
      }
    })
    return map
  }, [cargos])

  const sections = useMemo(() => Object.keys(sectionTone), [sectionTone])

  // Niveles existentes en la estructura (sin límite de profundidad)
  const niveles = useMemo(
    () => [...new Set(cargos.map((c) => c.nivel))].sort((a, b) => a - b),
    [cargos]
  )

  const vacantes = useMemo(() => cargos.filter((c) => c.vacante), [cargos])
  const sinCargo = useMemo(() => personal.filter((p) => !p.cargo_codigo), [personal])

  // Árbol para el OrganizationChart (una raíz por cada cargo sin superior)
  const chartRoots = useMemo(() => {
    const build = (cargo) => ({
      key: cargo.codigo,
      expanded: true,
      data: cargo,
      children: cargos
        .filter((c) => c.cargo_superior_codigo === cargo.codigo)
        .map(build),
    })
    return cargos.filter((c) => !c.cargo_superior_codigo).map(build)
  }, [cargos])

  // Códigos que no pueden ser superior del cargo en edición (él mismo y sus subordinados)
  const blockedSuperiors = useMemo(() => {
    if (!editingCodigo) return new Set()
    const blocked = new Set([editingCodigo])
    let changed = true
    while (changed) {
      changed = false
      cargos.forEach((c) => {
        if (c.cargo_superior_codigo && blocked.has(c.cargo_superior_codigo) && !blocked.has(c.codigo)) {
          blocked.add(c.codigo)
          changed = true
        }
      })
    }
    return blocked
  }, [cargos, editingCodigo])

  const superiorOptions = useMemo(
    () =>
      cargos.filter((c) => c.activo && !blockedSuperiors.has(c.codigo)),
    [cargos, blockedSuperiors]
  )

  const filteredCargos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cargos
    return cargos.filter(
      (c) =>
        c.codigo.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        c.seccion.toLowerCase().includes(q)
    )
  }, [cargos, search])

  const filteredPersonal = useMemo(() => {
    const q = search.trim().toLowerCase()
    return personal.filter((p) => {
      if (onlyUnassigned && p.cargo_codigo) return false
      if (!q) return true
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.cargo?.nombre || '').toLowerCase().includes(q)
      )
    })
  }, [personal, search, onlyUnassigned])

  // --- Acciones de cargos ---

  const openCreateModal = (superiorCodigo = '') => {
    setEditingCodigo(null)
    const superior = cargoByCodigo[superiorCodigo]
    const siblings = cargos.filter((c) => (c.cargo_superior_codigo || '') === superiorCodigo)
    setFormData({
      ...defaultForm,
      cargo_superior_codigo: superiorCodigo,
      seccion: superior?.seccion || '',
      orden: siblings.reduce((max, c) => Math.max(max, c.orden || 0), 0) + 1,
    })
    setSeccionNueva(sections.length === 0)
    setFormError('')
    setFieldErrors({})
    setModalVisible(true)
  }

  const openEditModal = (cargo) => {
    setEditingCodigo(cargo.codigo)
    setFormData({
      codigo: cargo.codigo,
      nombre: cargo.nombre,
      seccion: cargo.seccion,
      cargo_superior_codigo: cargo.cargo_superior_codigo || '',
      dependencia_externa: cargo.dependencia_externa || '',
      orden: cargo.orden ?? 0,
      activo: cargo.activo,
    })
    setSeccionNueva(false)
    setFormError('')
    setFieldErrors({})
    setModalVisible(true)
  }

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const validation = validateSchema(cargoSchema, formData)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setFormError(validation.firstError)
      return
    }

    setFormSubmitting(true)
    setFormError('')
    setFieldErrors({})
    try {
      const parsed = validation.data
      const payload = {
        ...parsed,
        cargo_superior_codigo: parsed.cargo_superior_codigo || null,
        dependencia_externa: parsed.cargo_superior_codigo ? null : parsed.dependencia_externa || null,
      }
      const res = await saveCargo(payload, editingCodigo)
      showToast({
        severity: 'success',
        summary: editingCodigo ? 'Cargo Actualizado' : 'Cargo Creado',
        detail: res.message,
        life: 4000,
      })
      setModalVisible(false)
    } catch (err) {
      const apiErr = extractApiValidationErrors(err, 'No se pudo guardar el cargo.')
      setFieldErrors(apiErr.fieldErrors)
      setFormError(apiErr.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggle = async (cargo) => {
    try {
      const res = await toggleCargo(cargo.codigo)
      showToast({ severity: 'info', summary: 'Estado Modificado', detail: res.message, life: 3000 })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'No se pudo cambiar el estado',
        detail: err.response?.data?.message || 'Error al cambiar el estado del cargo.',
        life: 5000,
      })
    }
  }

  const confirmDelete = (cargo) => {
    confirmDialog({
      header: 'Confirmar Eliminación',
      message: `¿Eliminar permanentemente el cargo "${cargo.nombre}" (${cargo.codigo})? Esta acción no se puede deshacer.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await removeCargo(cargo.codigo)
          showToast({ severity: 'success', summary: 'Cargo Eliminado', detail: res.message, life: 3500 })
        } catch (err) {
          showToast({
            severity: 'error',
            summary: 'Error al Eliminar',
            detail: err.response?.data?.message || 'No se pudo eliminar el cargo.',
            life: 5000,
          })
        }
      },
    })
  }

  // --- Asignación de personal ---

  const handleAssign = async (person, cargoCodigo) => {
    if (!cargoCodigo || cargoCodigo === person.cargo_codigo) return
    setSavingUserId(person.id)
    try {
      const res = await assignCargo(person.id, cargoCodigo)
      showToast({ severity: 'success', summary: 'Cargo Asignado', detail: res.message, life: 3500 })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'No se pudo asignar el cargo',
        detail: err.response?.data?.message || 'Error al asignar el cargo.',
        life: 6000,
      })
    } finally {
      setSavingUserId(null)
    }
  }

  // --- Render helpers ---

  const sectionChip = (seccion) => (
    <span className={`org-section-chip tone-${sectionTone[seccion] || 'slate'}`}>{seccion}</span>
  )

  const nodeTemplate = (node) => {
    const c = node.data
    return (
      <div className={`org-node tone-${sectionTone[c.seccion] || 'slate'} ${!c.activo ? 'is-inactive' : ''}`}>
        {c.dependencia_externa && (
          <div className="org-node-external">Depende de: {c.dependencia_externa}</div>
        )}
        <span className="org-node-code">{c.codigo}</span>
        <span className="org-node-name">{c.nombre}</span>
        <span className="org-node-section">{c.seccion}</span>
        {c.vacante && (
          <span className="org-vacant-badge org-node-vacant">
            <IconUserOff size={13} /> Vacante
          </span>
        )}
        {!c.activo && <span className="org-node-inactive">Inactivo</span>}
      </div>
    )
  }

  const isEmptyLoading = loading && cargos.length === 0

  return (
    <div className="categories-view org-view">
      {/* Encabezado */}
      <div className="page-header">
        <div className="header-titles">
          <h1 className="page-title">Estructura Organizacional</h1>
          <p className="page-subtitle">
            Organigrama del DEDTE: cargos, línea de dependencia y personal asignado. Esta
            estructura define los niveles por los que se relevan los tickets.
          </p>
        </div>
        <div className="header-actions">
          <Button
            label="Actualizar"
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={loadData}
            icon={<IconRefresh size={16} />}
          />
          <button className="btn-primary" onClick={() => openCreateModal()}>
            <IconPlus size={17} />
            <span>Nuevo Cargo</span>
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-subtle">
            <IconBriefcase size={22} className="text-blue" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Cargos</span>
            <span className="metric-val">{cargos.length}</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-purple-subtle">
            <IconBuildingCommunity size={22} className="text-purple" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Secciones</span>
            <span className="metric-val">{sections.length}</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle">
            <IconUsers size={22} className="text-emerald" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Personal con Cargo</span>
            <span className="metric-val text-emerald">
              {personal.length - sinCargo.length}/{personal.length}
            </span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap bg-slate-subtle">
            <IconUserOff size={22} className={vacantes.length ? 'text-red' : 'text-slate'} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Cargos Vacantes</span>
            <span className={`metric-val ${vacantes.length ? 'text-red' : ''}`}>{vacantes.length}</span>
          </div>
        </div>
      </div>

      {/* Avisos de consistencia */}
      {!isEmptyLoading && (vacantes.length > 0 || sinCargo.length > 0) && (
        <div className="org-warning">
          <IconAlertTriangle size={20} />
          <div>
            <b>La estructura está incompleta.</b>
            <ul>
              {vacantes.length > 0 && (
                <li>
                  {vacantes.length} cargo(s) sin personal activo:{' '}
                  {vacantes.map((v) => v.nombre).join(', ')}.
                </li>
              )}
              {sinCargo.length > 0 && (
                <li>
                  {sinCargo.length} usuario(s) del personal sin cargo asignado:{' '}
                  {sinCargo.map((p) => p.name).join(', ')}.
                </li>
              )}
            </ul>
            <button
              type="button"
              className="org-link-btn"
              onClick={() => {
                setActiveTab('personal')
                setOnlyUnassigned(sinCargo.length > 0)
              }}
            >
              Ir a Asignación de Personal →
            </button>
          </div>
        </div>
      )}

      {/* Pestañas */}
      <div className="org-tabs" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`org-tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {id === 'personal' && sinCargo.length > 0 && (
              <span className="org-tab-badge">{sinCargo.length}</span>
            )}
          </button>
        ))}
      </div>

      {error ? (
        <div className="table-container">
          <div className="error-state">
            <IconAlertCircle size={32} className="text-red" />
            <span>{error}</span>
            <Button label="Reintentar" severity="danger" size="small" onClick={loadData} />
          </div>
        </div>
      ) : isEmptyLoading ? (
        <div className="table-container">
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="20%" height="24px" />
                <Skeleton width="40%" height="24px" />
                <Skeleton width="25%" height="24px" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ---------------- ORGANIGRAMA ---------------- */}
          {activeTab === 'chart' && (
            <div className="table-container org-chart-card">
              <div className="org-legend">
                {sections.map((s) => (
                  <span key={s} className="org-legend-item">
                    <span className={`org-legend-dot tone-${sectionTone[s]}`} />
                    {s}
                  </span>
                ))}
              </div>
              <div className="org-chart-scroll">
                {chartRoots.length === 0 ? (
                  <div className="empty-state">
                    <IconSitemap size={44} className="text-muted" strokeWidth={1.5} />
                    <h3>Aún no hay cargos registrados</h3>
                  </div>
                ) : (
                  chartRoots.map((root) => (
                    <OrganizationChart key={root.key} value={[root]} nodeTemplate={nodeTemplate} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---------------- CARGOS ---------------- */}
          {activeTab === 'cargos' && (
            <>
              <div className="filters-card">
                <div className="search-box">
                  <IconSearch size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar por código, cargo o sección..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container">
                <table className="categories-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cargo</th>
                      <th>Sección Funcional</th>
                      <th>Depende de</th>
                      <th>Nivel</th>
                      <th>Personal</th>
                      <th>Estado</th>
                      <th className="text-right" style={{ width: '120px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCargos.map((c) => (
                      <tr key={c.codigo} className={!c.activo ? 'row-inactive' : ''}>
                        <td>
                          <span className="id-tag org-code-tag">{c.codigo}</span>
                        </td>
                        <td>
                          <span className="cat-name-primary">{c.nombre}</span>
                        </td>
                        <td>{sectionChip(c.seccion)}</td>
                        <td>
                          {c.cargo_superior_nombre ? (
                            <span className="org-depends">
                              {c.cargo_superior_nombre}
                              <small>{c.cargo_superior_codigo}</small>
                            </span>
                          ) : (
                            <span className="org-depends external">
                              {c.dependencia_externa || '—'}
                              <small>Externo</small>
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`org-level-pill level-${Math.min(c.nivel, 3)}`}>N{c.nivel}</span>
                        </td>
                        <td>
                          {c.vacante ? (
                            <span className="org-vacant-badge">
                              <IconUserOff size={13} /> Vacante
                            </span>
                          ) : (
                            <span className="badge-stat" title={c.usuarios.map((u) => u.name).join(', ')}>
                              <IconUsers size={14} className="text-emerald" />
                              <b>{c.usuarios_activos_count}</b> activo(s)
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn-status-toggle ${c.activo ? 'is-active' : 'is-inactive'}`}
                            onClick={() => handleToggle(c)}
                            title={c.activo ? 'Clic para desactivar el cargo' : 'Clic para activar el cargo'}
                          >
                            {c.activo ? (
                              <>
                                <IconToggleRight size={22} className="text-emerald" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <IconToggleLeft size={22} className="text-slate" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="actions-cell">
                            {c.activo && (
                              <button
                                type="button"
                                className="btn-action-icon edit"
                                title="Agregar cargo subordinado"
                                onClick={() => openCreateModal(c.codigo)}
                              >
                                <IconPlus size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-action-icon edit"
                              title="Editar cargo"
                              onClick={() => openEditModal(c)}
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-icon delete"
                              title="Eliminar cargo"
                              onClick={() => confirmDelete(c)}
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ---------------- ASIGNACIÓN DE PERSONAL ---------------- */}
          {activeTab === 'personal' && (
            <>
              <div className="filters-card">
                <div className="search-box">
                  <IconSearch size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar por nombre, correo o cargo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                      ✕
                    </button>
                  )}
                </div>
                <div className="filters-group">
                  <label className="org-check">
                    <input
                      type="checkbox"
                      checked={onlyUnassigned}
                      onChange={(e) => setOnlyUnassigned(e.target.checked)}
                    />
                    Solo personal sin cargo ({sinCargo.length})
                  </label>
                </div>
              </div>

              <div className="table-container">
                {filteredPersonal.length === 0 ? (
                  <div className="empty-state">
                    <IconUsers size={44} className="text-muted" strokeWidth={1.5} />
                    <h3>No hay personal que coincida</h3>
                  </div>
                ) : (
                  <table className="categories-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol de Sistema</th>
                        <th>Estado</th>
                        <th style={{ minWidth: '320px' }}>Cargo en la Estructura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPersonal.map((p) => (
                        <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                          <td>
                            <div className="org-person">
                              <span className="org-avatar lg">{initials(p.name)}</span>
                              <div>
                                <span className="cat-name-primary">{p.name}</span>
                                <small className="org-person-email">{p.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`org-role-pill ${p.role === 'admin' ? 'is-admin' : 'is-support'}`}>
                              {p.role === 'admin' ? 'Director (Admin)' : 'Técnico'}
                            </span>
                          </td>
                          <td>{p.activo ? 'Activo' : 'Inactivo'}</td>
                          <td>
                            <div className="org-assign-cell">
                              <select
                                className={`custom-select org-assign-select ${!p.cargo_codigo ? 'is-missing' : ''}`}
                                value={p.cargo_codigo || ''}
                                disabled={savingUserId === p.id}
                                onChange={(e) => handleAssign(p, e.target.value)}
                              >
                                {!p.cargo_codigo && <option value="">— Sin cargo asignado —</option>}
                                {niveles.map((nivel) => {
                                  const options = cargos.filter((c) => c.nivel === nivel && c.activo)
                                  if (options.length === 0) return null
                                  return (
                                    <optgroup key={nivel} label={nivelLabel(nivel)}>
                                      {options.map((c) => (
                                        <option key={c.codigo} value={c.codigo}>
                                          {c.codigo} — {c.nombre}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )
                                })}
                              </select>
                              {p.cargo && <span className="org-assign-section">{sectionChip(p.cargo.seccion)}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal Crear / Editar Cargo */}
      {modalVisible && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalVisible(false)
          }}
        >
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-header-titles">
                <h2 className="modal-title">{editingCodigo ? `Editar Cargo ${editingCodigo}` : 'Nuevo Cargo'}</h2>
                <span className="modal-subtitle">
                  El nivel del cargo se calcula automáticamente a partir del cargo del que depende.
                </span>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setModalVisible(false)}>
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} noValidate>
              <div className="modal-body">
                {formError && (
                  <div className="form-alert-error">
                    <IconAlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="org-form-row mt-3">
                  <div className="form-group">
                    <label className="form-label">
                      Código <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      className={`input-field ${fieldErrors.codigo ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.codigo)}
                      placeholder="Ej. DEDTE-TSE-008"
                      value={formData.codigo}
                      maxLength={30}
                      onChange={(e) => {
                        setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                        clearFieldError('codigo')
                      }}
                    />
                    {fieldErrors.codigo && (
                      <span className="field-error-text">{fieldErrors.codigo}</span>
                    )}
                    <span className="field-hint">Identificador único del cargo.</span>
                  </div>
                  <div className="form-group org-form-small">
                    <label className="form-label">Orden</label>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      className={`input-field ${fieldErrors.orden ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.orden)}
                      value={formData.orden}
                      onChange={(e) => {
                        setFormData({ ...formData, orden: e.target.value })
                        clearFieldError('orden')
                      }}
                    />
                    {fieldErrors.orden && (
                      <span className="field-error-text">{fieldErrors.orden}</span>
                    )}
                  </div>
                </div>
                <span className="field-hint org-hint-block">
                  <b>Orden:</b> posición del cargo entre los que dependen del mismo superior (de izquierda a
                  derecha en el organigrama y de arriba abajo en las listas). 1 = primero.
                </span>

                <div className="form-group mt-3">
                  <label className="form-label">
                    Nombre del Cargo <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    className={`input-field ${fieldErrors.nombre ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.nombre)}
                    placeholder="Ej. Técnico/a de Soporte en Educación Virtual"
                    value={formData.nombre}
                    maxLength={150}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value })
                      clearFieldError('nombre')
                    }}
                  />
                  {fieldErrors.nombre && (
                    <span className="field-error-text">{fieldErrors.nombre}</span>
                  )}
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">
                    Sección Funcional <span className="text-red">*</span>
                  </label>
                  <select
                    className={`custom-select org-full ${fieldErrors.seccion && !seccionNueva ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.seccion && !seccionNueva)}
                    value={seccionNueva ? NEW_SECTION : formData.seccion}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === NEW_SECTION) {
                        setSeccionNueva(true)
                        setFormData({ ...formData, seccion: '' })
                      } else {
                        setSeccionNueva(false)
                        setFormData({ ...formData, seccion: value })
                      }
                      clearFieldError('seccion')
                    }}
                  >
                    <option value="" disabled>
                      — Selecciona una sección —
                    </option>
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value={NEW_SECTION}>+ Nueva sección funcional…</option>
                  </select>
                  {seccionNueva && (
                    <input
                      type="text"
                      className={`input-field mt-2 ${fieldErrors.seccion ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.seccion)}
                      placeholder="Ej. Sec. III — Investigación e Innovación"
                      value={formData.seccion}
                      maxLength={80}
                      autoFocus
                      onChange={(e) => {
                        setFormData({ ...formData, seccion: e.target.value })
                        clearFieldError('seccion')
                      }}
                    />
                  )}
                  {fieldErrors.seccion && (
                    <span className="field-error-text">{fieldErrors.seccion}</span>
                  )}
                  <span className="field-hint">
                    Área o unidad del departamento a la que pertenece el cargo. Agrupa los cargos por color en el organigrama.
                  </span>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Depende de (Cargo Superior)</label>
                  <select
                    className={`custom-select org-full ${fieldErrors.cargo_superior_codigo ? 'input-invalid' : ''}`}
                    value={formData.cargo_superior_codigo}
                    onChange={(e) => {
                      setFormData({ ...formData, cargo_superior_codigo: e.target.value })
                      clearFieldError('cargo_superior_codigo')
                    }}
                  >
                    <option value="">— Ninguno (cargo raíz · Nivel 1) —</option>
                    {superiorOptions.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        N{c.nivel} · {c.codigo} — {c.nombre}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.cargo_superior_codigo && (
                    <span className="field-error-text">{fieldErrors.cargo_superior_codigo}</span>
                  )}
                  <span className="field-hint">
                    Nivel resultante:{' '}
                    <b>
                      {formData.cargo_superior_codigo
                        ? (cargoByCodigo[formData.cargo_superior_codigo]?.nivel || 0) + 1
                        : 1}
                    </b>
                  </span>
                </div>

                {!formData.cargo_superior_codigo && (
                  <div className="form-group mt-3">
                    <label className="form-label">Dependencia Externa</label>
                    <input
                      type="text"
                      className={`input-field ${fieldErrors.dependencia_externa ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.dependencia_externa)}
                      placeholder="Ej. DICAA — Vicerrectorado"
                      value={formData.dependencia_externa}
                      maxLength={150}
                      onChange={(e) => {
                        setFormData({ ...formData, dependencia_externa: e.target.value })
                        clearFieldError('dependencia_externa')
                      }}
                    />
                    {fieldErrors.dependencia_externa && (
                      <span className="field-error-text">{fieldErrors.dependencia_externa}</span>
                    )}
                    <span className="field-hint">Instancia fuera del sistema de la que depende el cargo raíz.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={formSubmitting}
                  onClick={() => setModalVisible(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  <IconCheck size={16} />
                  <span>{formSubmitting ? 'Guardando...' : editingCodigo ? 'Actualizar Cargo' : 'Crear Cargo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
