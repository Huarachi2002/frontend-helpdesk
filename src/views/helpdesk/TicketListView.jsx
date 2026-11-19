import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import {
  IconSearch,
  IconFilterOff,
  IconRefresh,
  IconEye,
  IconInbox,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconTicket,
  IconPlus,
  IconClock,
  IconMessageDots,
  IconCircleCheck,
  IconLock,
  IconFlame,
  IconSchool,
  IconFolders,
  IconX,
  IconCheck,
  IconShieldCheck,
  IconAlertTriangle,
  IconUserExclamation,
} from '@tabler/icons-react'
import { useTicketsStore } from '../../stores/ticketsStore.js'
import { useCategoriesStore } from '../../stores/categoriesStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import './TicketListView.css'

const defaultCreateForm = {
  asunto: '',
  descripcion: '',
  categoria_id: '',
  priority: 'medium',
}

export default function TicketListView() {
  const tickets = useTicketsStore((state) => state.tickets)
  const pagination = useTicketsStore((state) => state.pagination)
  const loading = useTicketsStore((state) => state.loading)
  const error = useTicketsStore((state) => state.error)
  const fetchTickets = useTicketsStore((state) => state.fetchTickets)
  const createNewTicket = useTicketsStore((state) => state.createNewTicket)

  const categories = useCategoriesStore((state) => state.categories)
  const fetchCategories = useCategoriesStore((state) => state.fetchCategories)

  const currentUser = useAuthStore((state) => state.user)
  const { showToast } = useToast()

  const [page, setPage] = useState(1)
  const [scopeFilter, setScopeFilter] = useState('all') // 'all' | 'pending' | 'in_progress' | 'waiting' | 'resolved' | 'critical'
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category_id: '',
  })

  // Modal para Crear Ticket
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ ...defaultCreateForm })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== '' ||
      filters.priority !== '' ||
      filters.category_id !== '' ||
      scopeFilter !== 'all'
    )
  }, [filters, scopeFilter])

  const loadTickets = useCallback(
    (targetPage = page, currentFilters = filters) => {
      const params = { page: targetPage }
      if (currentFilters.search) params.search = currentFilters.search
      if (currentFilters.status) params.status = currentFilters.status
      if (currentFilters.priority) params.priority = currentFilters.priority
      if (currentFilters.category_id) params.category_id = currentFilters.category_id
      fetchTickets(params)
    },
    [fetchTickets, page, filters]
  )

  useEffect(() => {
    loadTickets(page, filters)
    fetchCategories({ all: true }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTickets(page, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Métricas rápidas de la bandeja
  const totalTicketsCount = pagination?.total ?? tickets.length
  const enEsperaCount = useMemo(
    () => tickets.filter((t) => (t.estado || t.status) === 'EN_ESPERA' || (t.estado || t.status) === 'open').length,
    [tickets]
  )
  const enProcesoCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (t.estado || t.status) === 'CLIENTE_ESPERANDO_RESPUESTA' ||
          (t.estado || t.status) === 'ESPERANDO_POR_CLIENTE' ||
          (t.estado || t.status) === 'in_progress' ||
          (t.estado || t.status) === 'waiting'
      ).length,
    [tickets]
  )
  const resueltosCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (t.estado || t.status) === 'RESUELTO' ||
          (t.estado || t.status) === 'CERRADO' ||
          (t.estado || t.status) === 'resolved' ||
          (t.estado || t.status) === 'closed'
      ).length,
    [tickets]
  )

  // Filtrado de alcance rápido por pestañas (Scope Tabs)
  const displayedTickets = useMemo(() => {
    if (scopeFilter === 'pending') {
      return tickets.filter(
        (t) => (t.estado || t.status) === 'EN_ESPERA' || (t.estado || t.status) === 'open'
      )
    }
    if (scopeFilter === 'in_progress') {
      return tickets.filter(
        (t) =>
          (t.estado || t.status) === 'CLIENTE_ESPERANDO_RESPUESTA' ||
          (t.estado || t.status) === 'in_progress'
      )
    }
    if (scopeFilter === 'waiting') {
      return tickets.filter(
        (t) =>
          (t.estado || t.status) === 'ESPERANDO_POR_CLIENTE' ||
          (t.estado || t.status) === 'waiting'
      )
    }
    if (scopeFilter === 'resolved') {
      return tickets.filter(
        (t) =>
          (t.estado || t.status) === 'RESUELTO' ||
          (t.estado || t.status) === 'CERRADO' ||
          (t.estado || t.status) === 'resolved' ||
          (t.estado || t.status) === 'closed'
      )
    }
    if (scopeFilter === 'critical') {
      return tickets.filter((t) => {
        const p = (t.prioridad?.codigo || t.priority || '').toLowerCase()
        return p === 'critical' || p === 'high'
      })
    }
    return tickets
  }, [tickets, scopeFilter])

  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }))
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)
    setPage(1)
    loadTickets(1, nextFilters)
  }

  const applySearch = () => {
    setPage(1)
    loadTickets(1, filters)
  }

  const clearFilters = () => {
    const reset = { search: '', status: '', priority: '', category_id: '' }
    setFilters(reset)
    setScopeFilter('all')
    setPage(1)
    loadTickets(1, reset)
  }

  const changePage = (newPage) => {
    setPage(newPage)
  }

  // Creación de Ticket
  const openCreateTicketModal = () => {
    fetchCategories({ all: true }).catch(() => {})
    setCreateForm({
      ...defaultCreateForm,
      categoria_id: categories.length > 0 ? categories[0].id : '',
    })
    setFormError('')
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.asunto.trim()) {
      setFormError('El asunto de la incidencia es obligatorio.')
      return
    }
    if (!createForm.descripcion.trim()) {
      setFormError('La descripción del problema es obligatoria.')
      return
    }

    setFormSubmitting(true)
    setFormError('')

    try {
      const payload = {
        asunto: createForm.asunto.trim(),
        descripcion: createForm.descripcion.trim(),
        categoria_id: createForm.categoria_id ? Number(createForm.categoria_id) : null,
        priority: createForm.priority,
      }

      const res = await createNewTicket(payload)
      showToast({
        severity: 'success',
        summary: 'Ticket Registrado',
        detail: res.message || 'Incidencia creada y enrutada automáticamente al equipo de soporte.',
        life: 4000,
      })
      setCreateModalOpen(false)
      loadTickets(1, filters)
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Error al procesar la creación del ticket.'
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const statusLabel = (s) => {
    const map = {
      EN_ESPERA: 'En Espera',
      CLIENTE_ESPERANDO_RESPUESTA: 'Cliente Esperando Respuesta',
      ESPERANDO_POR_CLIENTE: 'Esperando por Cliente',
      RESUELTO: 'Resuelto',
      CERRADO: 'Cerrado',
      open: 'En Espera',
      in_progress: 'Cliente Esperando Respuesta',
      waiting: 'Esperando por Cliente',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }
    return map[s] ?? s
  }

  const renderStatusBadge = (s) => {
    const normalized = (s || '').toUpperCase()
    if (normalized === 'EN_ESPERA' || normalized === 'OPEN') {
      return (
        <span className="status-badge st-open" title="En espera de primera respuesta o triaje">
          <IconClock size={13} />
          <span>En Espera</span>
        </span>
      )
    }
    if (normalized === 'CLIENTE_ESPERANDO_RESPUESTA' || normalized === 'IN_PROGRESS') {
      return (
        <span className="status-badge st-in-progress" title="En atención técnica activa">
          <IconMessageDots size={13} />
          <span>Esperando Respuesta</span>
        </span>
      )
    }
    if (normalized === 'ESPERANDO_POR_CLIENTE' || normalized === 'WAITING') {
      return (
        <span className="status-badge st-waiting" title="Esperando retroalimentación del solicitante">
          <IconClock size={13} />
          <span>Esperando por Cliente</span>
        </span>
      )
    }
    if (normalized === 'RESUELTO' || normalized === 'RESOLVED') {
      return (
        <span className="status-badge st-resolved" title="Incidencia solucionada">
          <IconCircleCheck size={13} />
          <span>Resuelto</span>
        </span>
      )
    }
    if (normalized === 'CERRADO' || normalized === 'CLOSED') {
      return (
        <span className="status-badge st-closed" title="Ticket cerrado definitivamente">
          <IconLock size={13} />
          <span>Cerrado</span>
        </span>
      )
    }
    return <span className="status-badge st-default">{s}</span>
  }

  const renderPriorityBadge = (p) => {
    const code = (p || '').toLowerCase()
    if (code === 'critical') {
      return (
        <span className="prio-tag prio-critical" title="SLA: Máximo 4 horas">
          <IconFlame size={12} />
          <span>Crítica</span>
        </span>
      )
    }
    if (code === 'high') {
      return (
        <span className="prio-tag prio-high" title="SLA: Máximo 24 horas">
          <IconAlertTriangle size={12} />
          <span>Alta</span>
        </span>
      )
    }
    if (code === 'medium') {
      return (
        <span className="prio-tag prio-medium" title="SLA: Máximo 48 horas">
          <span>Media</span>
        </span>
      )
    }
    return (
      <span className="prio-tag prio-low" title="SLA: Máximo 72 horas">
        <span>Baja</span>
      </span>
    )
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const dateObj = new Date(d)
    return dateObj.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="tickets-view">
      {/* Encabezado Principal */}
      <div className="page-header">
        <div className="header-titles">
          <div className="title-with-badge">
            <h1 className="page-title">Bandeja de Incidencias & Tickets de Soporte</h1>
          </div>
          <p className="page-subtitle">
            Monitorea el ciclo de vida de los casos, atiende solicitudes y gestiona la asignación
            especializada con trazabilidad institucional.
          </p>
        </div>

        <div className="header-actions">
          <Button
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={() => loadTickets(page, filters)}
            icon={<IconRefresh size={16} />}
            label="Actualizar"
          />
          <button type="button" className="btn-primary" onClick={openCreateTicketModal}>
            <IconPlus size={17} />
            <span>Nueva Incidencia</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas (KPI Cards) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-subtle">
            <IconTicket size={22} className="text-blue" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Incidencias</span>
            <span className="metric-val">{totalTicketsCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-amber-subtle">
            <IconClock size={22} className="text-amber" />
          </div>
          <div className="metric-info">
            <span className="metric-label">En Espera (Triaje)</span>
            <span className="metric-val text-amber">{enEsperaCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-purple-subtle">
            <IconMessageDots size={22} className="text-purple" />
          </div>
          <div className="metric-info">
            <span className="metric-label">En Atención / Trámite</span>
            <span className="metric-val text-purple">{enProcesoCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle">
            <IconCircleCheck size={22} className="text-emerald" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Resueltos & Cerrados</span>
            <span className="metric-val text-emerald">{resueltosCount}</span>
          </div>
        </div>
      </div>

      {/* Pestañas Segmentadas de Alcance (Scope Tabs) */}
      <div className="segmented-scope-bar">
        <div className="scope-pills">
          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setScopeFilter('all')}
          >
            <IconTicket size={16} />
            <span>Todos los Tickets</span>
            <span className="scope-count">{totalTicketsCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setScopeFilter('pending')}
          >
            <IconClock size={16} />
            <span>En Espera</span>
            <span className="scope-count">{enEsperaCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setScopeFilter('in_progress')}
          >
            <IconMessageDots size={16} />
            <span>En Proceso</span>
            <span className="scope-count">{enProcesoCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setScopeFilter('resolved')}
          >
            <IconCircleCheck size={16} />
            <span>Resueltos</span>
            <span className="scope-count">{resueltosCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'critical' ? 'active' : ''}`}
            onClick={() => setScopeFilter('critical')}
          >
            <IconFlame size={16} />
            <span>Alta & Crítica</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="filters-card">
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            value={filters.search}
            placeholder="Buscar por código (TCK-...), asunto o descripción..."
            className="search-input"
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          {filters.search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                const next = { ...filters, search: '' }
                setFilters(next)
                loadTickets(1, next)
              }}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-group">
          {/* Filtro por Categoría */}
          <div className="filter-item">
            <span className="filter-label">Categoría:</span>
            <select
              name="category_id"
              value={filters.category_id}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="filter-item">
            <span className="filter-label">Estado:</span>
            <select
              name="status"
              value={filters.status}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todos los estados</option>
              <option value="EN_ESPERA">En Espera</option>
              <option value="CLIENTE_ESPERANDO_RESPUESTA">Cliente Esperando Respuesta</option>
              <option value="ESPERANDO_POR_CLIENTE">Esperando por Cliente</option>
              <option value="RESUELTO">Resuelto</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div className="filter-item">
            <span className="filter-label">Prioridad:</span>
            <select
              name="priority"
              value={filters.priority}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button type="button" className="btn-clear-filters" onClick={clearFilters}>
              <IconFilterOff size={15} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="table-card">
        {loading ? (
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="70px" height="26px" />
                <Skeleton width="35%" height="26px" />
                <Skeleton width="110px" height="26px" />
                <Skeleton width="100px" height="26px" />
                <Skeleton width="90px" height="26px" />
                <Skeleton width="100px" height="26px" />
                <Skeleton width="110px" height="26px" />
                <Skeleton width="80px" height="32px" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-container">
            <IconAlertCircle size={40} className="error-icon text-red" />
            <div className="error-title">No fue posible cargar las incidencias</div>
            <div className="error-desc">{error}</div>
            <Button
              label="Reintentar conexión"
              severity="secondary"
              size="small"
              onClick={() => loadTickets(page, filters)}
              className="mt-2"
            />
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <IconInbox size={48} strokeWidth={1.5} />
            </div>
            <h3 className="empty-title">No se encontraron tickets</h3>
            <p className="empty-desc">
              No hay incidencias que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
            {hasActiveFilters ? (
              <Button
                label="Restablecer filtros"
                severity="primary"
                outlined
                size="small"
                onClick={clearFilters}
              />
            ) : (
              <button type="button" className="btn-primary" onClick={openCreateTicketModal}>
                <IconPlus size={16} />
                <span>Registrar Primer Ticket</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th style={{ width: '95px' }}>Código</th>
                  <th style={{ minWidth: '280px' }}>Asunto de Incidencia</th>
                  <th style={{ width: '180px' }}>Solicitante</th>
                  <th style={{ width: '170px' }}>Estado</th>
                  <th style={{ width: '120px' }}>Prioridad</th>
                  <th style={{ width: '150px' }}>Categoría</th>
                  <th style={{ width: '180px' }}>Técnico Asignado</th>
                  <th style={{ width: '150px' }}>Fecha Apertura</th>
                  <th className="text-right" style={{ width: '110px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedTickets.map((t) => {
                  const solicitanteNombre =
                    t.solicitante?.name ||
                    t.solicitante?.nombre ||
                    t.created_by?.name ||
                    'Usuario Moodle'
                  const solicitanteRol = t.solicitante?.rol || t.created_by?.rol || 'Estudiante'
                  const moodleId = t.solicitante?.moodle_user_id || t.moodle_data?.user_id
                  const initialLetter = solicitanteNombre.charAt(0).toUpperCase()

                  const tecnicoNombre =
                    t.tecnico_asignado?.name ||
                    `${t.tecnico_asignado?.nombre || ''} ${t.tecnico_asignado?.apellido || ''}`.trim() ||
                    t.assigned_to?.name

                  return (
                    <tr key={t.id} className="table-row">
                      {/* Código */}
                      <td>
                        <span className="ticket-code-badge">{t.codigo || `#${t.id}`}</span>
                      </td>

                      {/* Asunto & Descripción */}
                      <td>
                        <div className="title-cell-wrap">
                          <Link to={`/tickets/${t.id}`} className="ticket-title-link">
                            {t.asunto || t.title}
                          </Link>
                          {(t.descripcion || t.description) && (
                            <span className="ticket-snippet-desc">
                              {(t.descripcion || t.description).slice(0, 80)}
                              {(t.descripcion || t.description).length > 80 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Solicitante */}
                      <td>
                        <div className="solicitante-profile-cell">
                          <div className="user-mini-avatar solicitante">
                            {initialLetter}
                          </div>
                          <div className="solicitante-info-stack">
                            <span className="solicitante-name-text" title={solicitanteNombre}>
                              {solicitanteNombre}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td>
                        {renderStatusBadge(t.estado || t.status)}
                      </td>

                      {/* Prioridad */}
                      <td>
                        {renderPriorityBadge(t.prioridad?.codigo || t.priority)}
                      </td>

                      {/* Categoría(s) */}
                      <td>
                        {t.categorias && t.categorias.length > 0 ? (
                          <div className="categories-chips-wrap">
                            {t.categorias.map((c) => (
                              <span key={c.id} className="cat-chip-table" title={c.descripcion || ''}>
                                {c.nombre || c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="cat-chip-table">
                            {t.category?.nombre || t.category?.name || 'General'}
                          </span>
                        )}
                      </td>

                      {/* Técnico Asignado */}
                      <td>
                        {tecnicoNombre ? (
                          <div className="assigned-user-cell">
                            <div className="user-mini-avatar technician">
                              {tecnicoNombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="technician-info-col">
                              <span className="technician-name-text" title={tecnicoNombre}>
                                {tecnicoNombre.slice(0, 14) + (tecnicoNombre.length > 14 ? '...' : '')}
                              </span>
                              {t.pending_reassignment && (
                                <span
                                  className="pending-reassign-mini-tag"
                                  title={`Reasignación solicitada hacia ${t.pending_reassignment.tecnico_propuesto?.name || 'otro técnico'}`}
                                >
                                  Reasignación pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="unassigned-chip" title="Pendiente de asignación por el motor">
                            <IconUserExclamation size={13} />
                            <span>Sin Asignar</span>
                          </span>
                        )}
                      </td>

                      {/* Fecha Apertura */}
                      <td>
                        <span className="date-cell-text">
                          {formatDate(t.fecha_creacion || t.times?.created_at)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="text-right">
                        <Link to={`/tickets/${t.id}`} className="btn-view-ticket">
                          <IconEye size={15} />
                          <span>Ver</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {pagination && pagination.total > 0 && (
          <div className="pagination-footer">
            <span className="pagination-info">
              Mostrando página <b>{pagination.current_page}</b> de <b>{pagination.last_page}</b> (
              <b>{pagination.total}</b> incidencias registradas)
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                disabled={pagination.current_page <= 1 || loading}
                onClick={() => changePage(pagination.current_page - 1)}
              >
                <IconChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                className="btn-page"
                disabled={pagination.current_page >= pagination.last_page || loading}
                onClick={() => changePage(pagination.current_page + 1)}
              >
                <span>Siguiente</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog: Crear Nueva Incidencia */}
      {createModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false)
          }}
        >
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-header-icon-wrap">
                <IconTicket size={22} className="text-blue" />
              </div>
              <div className="modal-header-text">
                <h2 className="modal-title">Registrar Nueva Incidencia</h2>
                <p className="modal-subtitle">
                  Ingresa los detalles del caso. El sistema asignará automáticamente al técnico
                  capacitado según la categoría y prioridad indicada.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-form-content">
              <div className="modal-scrollable-body">
                {formError && (
                  <div className="form-error-banner">
                    <IconAlertCircle size={20} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-field">
                  <label className="field-label">
                    Asunto o Título de la Incidencia <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Error de sincronización al cargar calificaciones en curso de Biología"
                    className="field-input"
                    value={createForm.asunto}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, asunto: e.target.value })
                    }
                  />
                  <span className="field-hint">
                    Escribe un resumen breve y preciso del problema reportado.
                  </span>
                </div>

                <div className="form-grid-2 mt-3">
                  <div className="form-field">
                    <label className="field-label">
                      Categoría Temática <span className="required-star">*</span>
                    </label>
                    <select
                      required
                      className="field-select"
                      value={createForm.categoria_id}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, categoria_id: e.target.value })
                      }
                    >
                      <option value="">Selecciona una temática...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre || cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      Nivel de Prioridad / SLA <span className="required-star">*</span>
                    </label>
                    <select
                      required
                      className="field-select"
                      value={createForm.priority}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, priority: e.target.value })
                      }
                    >
                      <option value="low">Baja — 72 horas SLA</option>
                      <option value="medium">Media — 48 horas SLA (Recomendado)</option>
                      <option value="high">Alta — 24 horas SLA</option>
                      <option value="critical">Crítica — 4 horas SLA (Afectación General)</option>
                    </select>
                  </div>
                </div>

                <div className="form-field mt-3">
                  <label className="field-label">
                    Descripción Detallada del Problema <span className="required-star">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe los pasos para reproducir el fallo, mensajes de error, usuario afectado y contexto relevante..."
                    className="field-input textarea-field"
                    value={createForm.descripcion}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, descripcion: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  label="Cancelar"
                  severity="secondary"
                  outlined
                  disabled={formSubmitting}
                  onClick={() => setCreateModalOpen(false)}
                />
                <Button
                  type="submit"
                  label={formSubmitting ? 'Creando y Asignando...' : 'Crear y Enrutar Ticket'}
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
