import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  IconFolders,
  IconFolderPlus,
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
  IconHelp,
} from '@tabler/icons-react'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { Skeleton } from 'primereact/skeleton'
import { confirmDialog } from 'primereact/confirmdialog'
import { useCategoriesStore } from '../../stores/categoriesStore.js'
import { useUsersStore } from '../../stores/usersStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import { categorySchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import './CategoriesManagementView.css'

const defaultForm = {
  id: null,
  nombre: '',
  descripcion: '',
  activo: true,
}

export default function CategoriesManagementView() {
  const categories = useCategoriesStore((state) => state.categories)
  const loading = useCategoriesStore((state) => state.loading)
  const error = useCategoriesStore((state) => state.error)
  const fetchCategories = useCategoriesStore((state) => state.fetchCategories)
  const saveCategory = useCategoriesStore((state) => state.saveCategory)
  const toggleStatus = useCategoriesStore((state) => state.toggleStatus)
  const removeCategory = useCategoriesStore((state) => state.removeCategory)

  // Refrescar categorías en usersStore para sincronización inmediata
  const refreshUserCategories = useUsersStore((state) => state.fetchCategories)

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
    fetchCategories({ all: true }).catch(() => {})
  }, [fetchCategories])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrado reactivo en cliente para velocidad instantánea
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch =
        search === '' ||
        (cat.nombre || cat.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (cat.descripcion || cat.description || '').toLowerCase().includes(search.toLowerCase())

      const matchActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && cat.activo) ||
        (activeFilter === 'inactive' && !cat.activo)

      return matchSearch && matchActive
    })
  }, [categories, search, activeFilter])

  // Métricas rápidas
  const totalCount = categories.length
  const activeCount = useMemo(() => categories.filter((c) => c.activo).length, [categories])
  const inactiveCount = totalCount - activeCount
  const totalTicketsLinked = useMemo(
    () => categories.reduce((acc, c) => acc + (c.tickets_count || 0), 0),
    [categories]
  )

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({ ...defaultForm })
    setFormError('')
    setFieldErrors({})
    setModalVisible(true)
  }

  const openEditModal = (cat) => {
    setIsEditing(true)
    setFormData({
      id: cat.id,
      nombre: cat.nombre || cat.name || '',
      descripcion: cat.descripcion || cat.description || '',
      activo: Boolean(cat.activo),
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
    const validation = validateSchema(categorySchema, formData)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setFormError(validation.firstError)
      return
    }

    setFormSubmitting(true)
    setFormError('')
    setFieldErrors({})

    try {
      const res = await saveCategory(validation.data)
      showToast({
        severity: 'success',
        summary: isEditing ? 'Categoría Actualizada' : 'Categoría Creada',
        detail: res.message || 'Operación realizada correctamente.',
        life: 3500,
      })

      // Sincronizar catálogo global para que Gestionar Usuarios lo refleje al instante
      refreshUserCategories().catch(() => {})

      setModalVisible(false)
    } catch (err) {
      const apiErr = extractApiValidationErrors(
        err,
        'Error al procesar la solicitud de la categoría.'
      )
      setFieldErrors(apiErr.fieldErrors)
      setFormError(apiErr.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleActive = async (cat) => {
    try {
      const res = await toggleStatus(cat.id)
      showToast({
        severity: 'info',
        summary: 'Estado Modificado',
        detail: res.message || 'Disponibilidad de la categoría actualizada.',
        life: 3000,
      })
      refreshUserCategories().catch(() => {})
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'No se pudo cambiar el estado de la categoría.',
        life: 4000,
      })
    }
  }

  const confirmDeleteCategory = (cat) => {
    if (cat.tickets_count > 0) {
      confirmDialog({
        header: 'Categoría con Tickets Vinculados',
        message: `La categoría "${cat.nombre}" tiene ${cat.tickets_count} ticket(s) asociado(s). Para preservar la trazabilidad e integridad del historial según las directrices del sistema, no se puede eliminar físicamente. ¿Deseas desactivarla para que no aparezca en nuevas asignaciones?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Desactivar Categoría',
        rejectLabel: 'Cancelar',
        acceptClassName: 'p-button-warning',
        accept: () => handleToggleActive(cat),
      })
      return
    }

    confirmDialog({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar permanentemente la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await removeCategory(cat.id)
          showToast({
            severity: 'success',
            summary: 'Categoría Eliminada',
            detail: res.message || 'Categoría eliminada del catálogo.',
            life: 3500,
          })
          refreshUserCategories().catch(() => {})
        } catch (err) {
          showToast({
            severity: 'error',
            summary: 'Error al Eliminar',
            detail: err.response?.data?.message || 'No se pudo eliminar la categoría.',
            life: 4000,
          })
        }
      },
    })
  }

  return (
    <div className="categories-view">
      {/* Header */}
      <div className="page-header">
        <div className="header-titles">
          <div className="title-with-badge">
            <h1 className="page-title">Gestión de Clasificación de Categorías</h1>
          </div>
          <p className="page-subtitle">
            Define, clasifica y administra las temáticas de incidencias.
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
          <button className="btn-primary" onClick={openCreateModal}>
            <IconFolderPlus size={17} />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-subtle">
            <IconFolders size={22} className="text-blue" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Categorías</span>
            <span className="metric-val">{totalCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle">
            <IconCheck size={22} className="text-emerald" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Categorías Activas</span>
            <span className="metric-val text-emerald">{activeCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-slate-subtle">
            <IconAlertCircle size={22} className="text-slate" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Archivadas / En Pausa</span>
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
            placeholder="Buscar por nombre o descripción de temática..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
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
              <option value="all">Todas las categorías</option>
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
      <div className="table-container">
        {loading && categories.length === 0 ? (
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="40px" height="24px" />
                <Skeleton width="25%" height="24px" />
                <Skeleton width="45%" height="24px" />
                <Skeleton width="90px" height="24px" />
                <Skeleton width="80px" height="24px" />
                <Skeleton width="80px" height="32px" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-state">
            <IconAlertCircle size={32} className="text-red" />
            <span>{error}</span>
            <Button
              label="Reintentar"
              severity="danger"
              size="small"
              onClick={loadData}
              className="mt-2"
            />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <IconFolders size={44} className="text-muted" strokeWidth={1.5} />
            <h3>No se encontraron categorías</h3>
            <p>
              {search || activeFilter !== 'all'
                ? 'Ninguna categoría coincide con los criterios de búsqueda actuales.'
                : 'Aún no se han configurado categorías de soporte.'}
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
              <button className="btn-primary" onClick={openCreateModal}>
                <IconFolderPlus size={16} />
                <span>Crear Primera Categoría</span>
              </button>
            )}
          </div>
        ) : (
          <table className="categories-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Nombre de la Temática</th>
                <th>Descripción y Alcance</th>
                <th>Tickets Registrados</th>
                <th>Técnicos Habilitados</th>
                <th>Disponibilidad</th>
                <th className="text-right" style={{ width: '130px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className={!cat.activo ? 'row-inactive' : ''}>
                  {/* ID */}
                  <td>
                    <span className="id-tag">#{cat.id}</span>
                  </td>

                  {/* Nombre */}
                  <td>
                    <div className="cat-name-cell">
                      <div className={`cat-icon-circle ${cat.activo ? 'active' : 'inactive'}`}>
                        <IconFolders size={17} />
                      </div>
                      <div className="cat-title-group">
                        <span className="cat-name-primary">
                          {cat.nombre || cat.name}
                        </span>
                        {!cat.activo && (
                          <span className="cat-sub-badge">En pausa</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Descripción */}
                  <td>
                    <p className="cat-description-text" title={cat.descripcion || cat.description}>
                      {cat.descripcion || cat.description || (
                        <em className="text-muted">Sin descripción detallada</em>
                      )}
                    </p>
                  </td>

                  {/* Tickets */}
                  <td>
                    <span className="badge-stat">
                      <IconTicket size={14} className="text-blue" />
                      <b>{cat.tickets_count || 0}</b> tickets
                    </span>
                  </td>

                  {/* Técnicos */}
                  <td>
                    <span className="badge-stat">
                      <IconUsers size={14} className="text-emerald" />
                      <b>{cat.usuarios_count || 0}</b> agentes
                    </span>
                  </td>

                  {/* Estado / Switch */}
                  <td>
                    <button
                      type="button"
                      className={`btn-status-toggle ${cat.activo ? 'is-active' : 'is-inactive'}`}
                      onClick={() => handleToggleActive(cat)}
                      title={cat.activo ? 'Clic para archivar categoría' : 'Clic para activar categoría'}
                    >
                      {cat.activo ? (
                        <>
                          <IconToggleRight size={22} className="text-emerald" />
                          <span>Activa</span>
                        </>
                      ) : (
                        <>
                          <IconToggleLeft size={22} className="text-slate" />
                          <span>Inactiva</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="btn-action-icon edit"
                        title="Editar categoría"
                        onClick={() => openEditModal(cat)}
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon delete"
                        title={cat.tickets_count > 0 ? 'Desactivar categoría (con tickets)' : 'Eliminar categoría'}
                        onClick={() => confirmDeleteCategory(cat)}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Dialog para Crear / Editar Categoría */}
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
                  {isEditing ? `Editar Categoría #${formData.id}` : 'Nueva Categoría de Soporte'}
                </h2>
                <span className="modal-subtitle">
                  {isEditing
                    ? 'Modifica los parámetros y disponibilidad de la temática'
                    : 'Ingresa los datos para registrar una nueva clasificación en el catálogo'}
                </span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalVisible(false)}
              >
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

                {/* Campo Nombre */}
                <div className="form-group mt-3">
                  <label className="form-label">
                    Nombre de la Categoría <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    className={`input-field ${fieldErrors.nombre ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.nombre)}
                    placeholder="Ej. Acceso y Login, Problemas Técnicos, Laboratorio Virtual..."
                    value={formData.nombre}
                    maxLength={100}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value })
                      clearFieldError('nombre')
                    }}
                  />
                  {fieldErrors.nombre && (
                    <span className="field-error-text">{fieldErrors.nombre}</span>
                  )}
                  <span className="field-hint">
                    Nombre conciso y descriptivo de la temática de soporte (máx. 100 caracteres).
                  </span>
                </div>

                {/* Campo Descripción */}
                <div className="form-group mt-3">
                  <label className="form-label">Descripción del Alcance Temático</label>
                  <textarea
                    className={`textarea-field ${fieldErrors.descripcion ? 'input-invalid' : ''}`}
                    aria-invalid={Boolean(fieldErrors.descripcion)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe los tipos de problemas, errores frecuentes y requerimientos que abarca esta categoría..."
                    value={formData.descripcion}
                    onChange={(e) => {
                      setFormData({ ...formData, descripcion: e.target.value })
                      clearFieldError('descripcion')
                    }}
                  />
                  {fieldErrors.descripcion && (
                    <span className="field-error-text">{fieldErrors.descripcion}</span>
                  )}
                  <span className="field-hint">
                    Esta explicación sirve de guía para los técnicos y como base de conocimiento para el clasificador inteligente.
                  </span>
                </div>

                {/* Switch Estado Activo */}
                <div className="form-group mt-3">
                  <label className="checkbox-active-wrap">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) =>
                        setFormData({ ...formData, activo: e.target.checked })
                      }
                    />
                    <div className="checkbox-text-group">
                      <span className="checkbox-title">
                        Categoría Activa para nuevas asignaciones
                      </span>
                      <span className="checkbox-desc">
                        Si se desmarca, se mantendrá el historial de tickets existentes pero no se podrá seleccionar para nuevos casos.
                      </span>
                    </div>
                  </label>
                </div>
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
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  <IconCheck size={16} />
                  <span>
                    {formSubmitting
                      ? 'Guardando...'
                      : isEditing
                      ? 'Actualizar Categoría'
                      : 'Crear Categoría'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
