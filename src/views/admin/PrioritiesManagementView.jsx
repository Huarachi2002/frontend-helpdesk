import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  IconFlame,
  IconClock,
  IconPlus,
  IconSearch,
  IconX,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconCheck,
  IconInfoCircle,
  IconAlertCircle,
  IconTicket,
  IconUsers,
  IconToggleLeft,
  IconToggleRight,
  IconShieldCheck,
  IconScale,
  IconHourglassLow,
} from '@tabler/icons-react'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { Skeleton } from 'primereact/skeleton'
import { confirmDialog } from 'primereact/confirmdialog'
import { usePrioritiesStore } from '../../stores/prioritiesStore.js'
import { useUsersStore } from '../../stores/usersStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import { prioritySchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import './PrioritiesManagementView.css'

const defaultForm = {
  id: null,
  nombre: '',
  codigo: '',
  peso_nivel: 1,
  sla_horas_resolucion: 48,
  activo: true,
}

export default function PrioritiesManagementView() {
  const priorities = usePrioritiesStore((state) => state.priorities)
  const loading = usePrioritiesStore((state) => state.loading)
  const error = usePrioritiesStore((state) => state.error)
  const fetchPriorities = usePrioritiesStore((state) => state.fetchPriorities)
  const savePriority = usePrioritiesStore((state) => state.savePriority)
  const toggleStatus = usePrioritiesStore((state) => state.toggleStatus)
  const removePriority = usePrioritiesStore((state) => state.removePriority)

  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formData, setFormData] = useState({ ...defaultForm })

  const loadData = useCallback(() => {
    fetchPriorities({ all: true }).catch(() => {})
  }, [fetchPriorities])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrado reactivo en cliente
  const filteredPriorities = useMemo(() => {
    return priorities.filter((p) => {
      const matchSearch =
        search === '' ||
        (p.nombre || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.codigo || p.code || '').toLowerCase().includes(search.toLowerCase())

      const matchActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && p.activo) ||
        (activeFilter === 'inactive' && !p.activo)

      return matchSearch && matchActive
    })
  }, [priorities, search, activeFilter])

  // Métricas rápidas
  const totalCount = priorities.length
  const activeCount = useMemo(() => priorities.filter((p) => p.activo).length, [priorities])
  const inactiveCount = totalCount - activeCount
  const totalTicketsLinked = useMemo(
    () => priorities.reduce((acc, p) => acc + (p.tickets_count || 0), 0),
    [priorities]
  )

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({ ...defaultForm, peso_nivel: priorities.length + 1 })
    setFormError('')
    setFieldErrors({})
    setModalVisible(true)
  }

  const openEditModal = (p) => {
    setIsEditing(true)
    setFormData({
      id: p.id,
      nombre: p.nombre || p.name || '',
      codigo: p.codigo || p.code || '',
      peso_nivel: Number(p.peso_nivel ?? p.weight ?? 1),
      sla_horas_resolucion: Number(p.sla_horas_resolucion ?? p.sla_hours ?? 24),
      activo: Boolean(p.activo),
    })
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
    const validation = validateSchema(prioritySchema, formData)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setFormError(validation.firstError)
      return
    }

    setFormSubmitting(true)
    setFormError('')
    setFieldErrors({})

    try {
      const res = await savePriority(validation.data)
      showToast({
        severity: 'success',
        summary: isEditing ? 'Prioridad Actualizada' : 'Prioridad Creada',
        detail: res.message || 'Configuración de SLA registrada correctamente.',
        life: 3500,
      })

      setModalVisible(false)
    } catch (err) {
      const apiErr = extractApiValidationErrors(
        err,
        'Error al procesar la solicitud de la prioridad.'
      )
      setFieldErrors(apiErr.fieldErrors)
      setFormError(apiErr.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleActive = async (p) => {
    try {
      const res = await toggleStatus(p.id)
      showToast({
        severity: 'info',
        summary: 'Estado Modificado',
        detail: res.message || 'Disponibilidad de la prioridad actualizada.',
        life: 3000,
      })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'No se pudo cambiar el estado de la prioridad.',
        life: 4000,
      })
    }
  }

  const confirmDeletePriority = (p) => {
    if (p.tickets_count > 0) {
      confirmDialog({
        header: 'Prioridad con Tickets Vinculados',
        message: (
          <div className="confirm-delete-body">
            <p>
              La prioridad <strong>"{p.nombre}"</strong> tiene <strong>{p.tickets_count} ticket(s)</strong> asociado(s).
            </p>
            <div className="alert-delete-warning">
              <IconAlertCircle size={18} />
              <span>
                Para preservar el historial de incidencias y el cálculo histórico de métricas SLA, no es posible
                eliminarla físicamente. ¿Deseas desactivarla para que no aparezca en nuevas asignaciones?
              </span>
            </div>
          </div>
        ),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Desactivar Prioridad',
        rejectLabel: 'Cancelar',
        acceptClassName: 'p-button-warning',
        accept: () => handleToggleActive(p),
      })
      return
    }

    confirmDialog({
      header: 'Confirmar Eliminación de Prioridad',
      message: (
        <div className="confirm-delete-body">
          <p>
            ¿Estás seguro de que deseas eliminar permanentemente la prioridad <strong>"{p.nombre}"</strong> ({p.codigo})?
          </p>
          <p className="text-muted text-sm">
            Esta acción desvinculará a los técnicos asignados a este nivel y no se puede deshacer.
          </p>
        </div>
      ),
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar Prioridad',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await removePriority(p.id)
          showToast({
            severity: 'success',
            summary: 'Prioridad Eliminada',
            detail: res.message || 'Prioridad eliminada del catálogo.',
            life: 3500,
          })
        } catch (err) {
          showToast({
            severity: 'error',
            summary: 'Error al Eliminar',
            detail: err.response?.data?.message || 'No se pudo eliminar la prioridad.',
            life: 4000,
          })
        }
      },
    })
  }

  const formatSlaDuration = (hours) => {
    if (!hours) return '—'
    if (hours < 24) return `${hours} horas`
    const days = Math.floor(hours / 24)
    const remainder = hours % 24
    if (remainder === 0) {
      return `${hours}h (${days} ${days === 1 ? 'día' : 'días'})`
    }
    return `${hours}h (${days}d ${remainder}h)`
  }

  const getPriorityStyleClass = (code) => {
    const c = (code || '').toLowerCase()
    if (c === 'critical' || c === 'critica') return 'prio-style-critical'
    if (c === 'high' || c === 'alta') return 'prio-style-high'
    if (c === 'medium' || c === 'media') return 'prio-style-medium'
    return 'prio-style-low'
  }

  return (
    <div className="priorities-view">
      {/* Encabezado Principal */}
      <div className="page-header">
        <div className="header-titles">
          <div className="title-with-badge">
            <h1 className="page-title">Gestión de Niveles de Prioridad y SLAs</h1>
            <span className="badge-scope">
              <IconShieldCheck size={16} />
              <span>Acuerdos de Nivel de Servicio (SLA)</span>
            </span>
          </div>
          <p className="page-subtitle">
            Configura los niveles de urgencia, pesos de escalamiento y tiempos de resolución comprometidos (SLA).
            Estas prioridades determinan la elegibilidad de técnicos y el enrutamiento de incidencias.
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
          <button type="button" className="btn-primary" onClick={openCreateModal}>
            <IconPlus size={17} />
            <span>Nueva Prioridad</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas (KPIs) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-subtle">
            <IconFlame size={22} className="text-blue" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Prioridades</span>
            <span className="metric-val">{totalCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle">
            <IconCheck size={22} className="text-emerald" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Prioridades Activas</span>
            <span className="metric-val text-emerald">{activeCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-slate-subtle">
            <IconClock size={22} className="text-slate" />
          </div>
          <div className="metric-info">
            <span className="metric-label">En Pausa / Archivadas</span>
            <span className="metric-val text-slate">{inactiveCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-purple-subtle">
            <IconTicket size={22} className="text-purple" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tickets Vinculados</span>
            <span className="metric-val">{totalTicketsLinked}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filters-card">
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o código (ej. Crítica, low, high)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-group">
          <div className="filter-item">
            <label className="filter-label">Estado:</label>
            <select
              className="custom-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">Todas las prioridades</option>
              <option value="active">Solo Activas</option>
              <option value="inactive">Solo Inactivas (Archivadas)</option>
            </select>
          </div>

          {(search || activeFilter !== 'all') && (
            <Button
              label="Limpiar filtros"
              severity="secondary"
              text
              size="small"
              onClick={() => {
                setSearch('')
                setActiveFilter('all')
              }}
              icon={<IconX size={15} />}
            />
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="table-card">
        {loading && priorities.length === 0 ? (
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="45px" height="24px" />
                <Skeleton width="25%" height="24px" />
                <Skeleton width="15%" height="24px" />
                <Skeleton width="20%" height="24px" />
                <Skeleton width="90px" height="24px" />
                <Skeleton width="90px" height="24px" />
                <Skeleton width="80px" height="24px" />
                <Skeleton width="80px" height="32px" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-state">
            <IconAlertCircle size={36} className="text-red" />
            <h3>Error al cargar las prioridades</h3>
            <p>{error}</p>
            <Button
              label="Reintentar"
              severity="danger"
              size="small"
              onClick={loadData}
              className="mt-2"
            />
          </div>
        ) : filteredPriorities.length === 0 ? (
          <div className="empty-state">
            <IconFlame size={46} className="text-muted" strokeWidth={1.5} />
            <h3>No se encontraron prioridades</h3>
            <p>
              {search || activeFilter !== 'all'
                ? 'Ninguna prioridad coincide con los criterios de búsqueda actuales.'
                : 'Aún no se han configurado niveles de prioridad en el sistema.'}
            </p>
            {search || activeFilter !== 'all' ? (
              <Button
                label="Restablecer filtros"
                severity="primary"
                outlined
                size="small"
                onClick={() => {
                  setSearch('')
                  setActiveFilter('all')
                }}
              />
            ) : (
              <button type="button" className="btn-primary" onClick={openCreateModal}>
                <IconPlus size={16} />
                <span>Crear Primera Prioridad</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="priorities-table">
              <thead>
                <tr>
                  <th style={{ width: '65px' }}>ID</th>
                  <th style={{ minWidth: '220px' }}>Prioridad & Código</th>
                  <th style={{ width: '150px' }}>Peso Jerárquico</th>
                  <th style={{ width: '200px' }}>Tiempo SLA (Resolución)</th>
                  <th style={{ width: '140px' }}>Tickets Vinculados</th>
                  <th style={{ width: '140px' }}>Técnicos Habilitados</th>
                  <th style={{ width: '120px' }}>Disponibilidad</th>
                  <th className="text-right" style={{ width: '110px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPriorities.map((p) => {
                  const styleClass = getPriorityStyleClass(p.codigo)
                  return (
                    <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                      {/* ID */}
                      <td>
                        <span className="id-tag">#{p.id}</span>
                      </td>

                      {/* Nombre & Código */}
                      <td>
                        <div className="prio-name-cell">
                          <div className={`prio-icon-circle ${styleClass}`}>
                            <IconFlame size={17} />
                          </div>
                          <div className="prio-title-group">
                            <span className="prio-name-primary">{p.nombre || p.name}</span>
                            <span className="prio-code-micro font-mono">code: {p.codigo || p.code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Peso Jerárquico */}
                      <td>
                        <div className="weight-badge-cell">
                          <span className={`weight-badge ${styleClass}`}>
                            Nivel {p.peso_nivel ?? p.weight}
                          </span>
                        </div>
                      </td>

                      {/* SLA Horas */}
                      <td>
                        <div className="sla-badge-cell">
                          <IconClock size={15} className="sla-clock-icon" />
                          <span className="sla-time-text">
                            {formatSlaDuration(p.sla_horas_resolucion ?? p.sla_hours)}
                          </span>
                        </div>
                      </td>

                      {/* Tickets Vinculados */}
                      <td>
                        <span className="badge-stat">
                          <IconTicket size={14} className="text-purple" />
                          <b>{p.tickets_count || 0}</b> tickets
                        </span>
                      </td>

                      {/* Técnicos Habilitados */}
                      <td>
                        <span className="badge-stat">
                          <IconUsers size={14} className="text-blue" />
                          <b>{p.usuarios_count || 0}</b> técnicos
                        </span>
                      </td>

                      {/* Switch Disponibilidad */}
                      <td>
                        <button
                          type="button"
                          className={`btn-toggle-switch ${p.activo ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleActive(p)}
                          title={p.activo ? 'Clic para desactivar' : 'Clic para activar'}
                        >
                          {p.activo ? (
                            <>
                              <IconToggleRight size={20} className="text-emerald" />
                              <span className="toggle-label text-emerald">Activa</span>
                            </>
                          ) : (
                            <>
                              <IconToggleLeft size={20} className="text-slate" />
                              <span className="toggle-label text-slate">Pausada</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="text-right">
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-action-icon edit"
                            title="Editar prioridad y SLA"
                            onClick={() => openEditModal(p)}
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-action-icon delete"
                            title="Eliminar prioridad"
                            onClick={() => confirmDeletePriority(p)}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Formulario */}
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
                <h2 className="modal-title">
                  {isEditing ? `Editar Prioridad #${formData.id}` : 'Nueva Prioridad de Atención'}
                </h2>
                <span className="modal-subtitle">
                  {isEditing
                    ? 'Modifica los parámetros de tiempo, nivel jerárquico y activación'
                    : 'Registra un nuevo nivel de urgencia y su compromiso SLA'}
                </span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalVisible(false)}
                aria-label="Cerrar modal"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="modal-form-wrap" noValidate>
              <div className="modal-body">
                {formError && (
                  <div className="form-alert-error">
                    <IconAlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Banner Informativo */}
                <div className="integration-info-banner">
                  <IconInfoCircle size={20} className="text-blue flex-shrink-0" />
                  <div className="integration-text">
                    <b>Cálculo de SLA y Asignación Especializada:</b>
                    <p>
                      El tiempo SLA establece el límite máximo para la resolución del ticket. El peso jerárquico
                      define el orden de prioridad en la cola de asignación automática a los técnicos.
                    </p>
                  </div>
                </div>

                <div className="form-row mt-3">
                  <div className="form-group flex-1">
                    <label className="form-label">
                      Nombre de la Prioridad <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="Ej. Crítica, Alta, Media, Baja"
                      className={`input-field ${fieldErrors.nombre ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.nombre)}
                      value={formData.nombre}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value })
                        clearFieldError('nombre')
                      }}
                    />
                    {fieldErrors.nombre && (
                      <span className="field-error-text">{fieldErrors.nombre}</span>
                    )}
                    <span className="hint-text">Etiqueta mostrada en tickets y reportes.</span>
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">
                      Código Identificador (Slug) <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="Ej. critical, high, medium, low"
                      className={`input-field font-mono ${fieldErrors.codigo ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.codigo)}
                      value={formData.codigo}
                      onChange={(e) => {
                        setFormData({ ...formData, codigo: e.target.value.toLowerCase().trim() })
                        clearFieldError('codigo')
                      }}
                    />
                    {fieldErrors.codigo && (
                      <span className="field-error-text">{fieldErrors.codigo}</span>
                    )}
                    <span className="hint-text">Identificador técnico único en minúsculas.</span>
                  </div>
                </div>

                <div className="form-row mt-3">
                  <div className="form-group flex-1">
                    <label className="form-label">
                      Nivel de Peso Jerárquico <span className="text-red">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="Ej. 1, 2, 3, 4"
                      className={`input-field ${fieldErrors.peso_nivel ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.peso_nivel)}
                      value={formData.peso_nivel}
                      onChange={(e) => {
                        setFormData({ ...formData, peso_nivel: e.target.value })
                        clearFieldError('peso_nivel')
                      }}
                    />
                    {fieldErrors.peso_nivel && (
                      <span className="field-error-text">{fieldErrors.peso_nivel}</span>
                    )}
                    <span className="hint-text">
                      Mayor número = Mayor urgencia de atención en la cola.
                    </span>
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">
                      Tiempo SLA de Resolución (Horas) <span className="text-red">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8760}
                      placeholder="Ej. 4, 24, 48, 72"
                      className={`input-field ${fieldErrors.sla_horas_resolucion ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(fieldErrors.sla_horas_resolucion)}
                      value={formData.sla_horas_resolucion}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          sla_horas_resolucion: e.target.value,
                        })
                        clearFieldError('sla_horas_resolucion')
                      }}
                    />
                    {fieldErrors.sla_horas_resolucion && (
                      <span className="field-error-text">{fieldErrors.sla_horas_resolucion}</span>
                    )}
                    <span className="hint-text">
                      Plazo máximo comprometido ({Number(formData.sla_horas_resolucion) > 0 ? formatSlaDuration(Number(formData.sla_horas_resolucion)) : '—'}).
                    </span>
                  </div>
                </div>

                {/* Switch Disponibilidad */}
                <div className="form-group mt-4">
                  <label className="checkbox-active-wrap">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    />
                    <div className="checkbox-text-group">
                      <span className="checkbox-title">Prioridad Activa en el Sistema</span>
                      <span className="checkbox-desc">
                        Las prioridades activas se encuentran disponibles para asignar a tickets e incluirse en
                        las competencias de los técnicos de soporte.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  label="Cancelar"
                  severity="secondary"
                  outlined
                  disabled={formSubmitting}
                  onClick={() => setModalVisible(false)}
                />
                <Button
                  type="submit"
                  label={
                    formSubmitting
                      ? 'Guardando...'
                      : isEditing
                      ? 'Guardar Cambios'
                      : 'Crear Prioridad'
                  }
                  severity="primary"
                  loading={formSubmitting}
                  icon={<IconCheck size={16} />}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
