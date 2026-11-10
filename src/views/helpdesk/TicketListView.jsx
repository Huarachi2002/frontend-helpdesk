import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import {
  IconSearch,
  IconFilterOff,
  IconRefresh,
  IconEye,
  IconInbox,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { useTicketsStore } from '../../stores/ticketsStore.js'
import './TicketListView.css'

export default function TicketListView() {
  const tickets = useTicketsStore((state) => state.tickets)
  const pagination = useTicketsStore((state) => state.pagination)
  const loading = useTicketsStore((state) => state.loading)
  const error = useTicketsStore((state) => state.error)
  const fetchTickets = useTicketsStore((state) => state.fetchTickets)

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })

  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' || filters.status !== '' || filters.priority !== ''
  }, [filters])

  const loadTickets = useCallback(
    (targetPage = page, currentFilters = filters) => {
      const params = { page: targetPage }
      if (currentFilters.search) params.search = currentFilters.search
      if (currentFilters.status) params.status = currentFilters.status
      if (currentFilters.priority) params.priority = currentFilters.priority
      fetchTickets(params)
    },
    [fetchTickets, page, filters]
  )

  useEffect(() => {
    loadTickets(page, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const reset = { search: '', status: '', priority: '' }
    setFilters(reset)
    setPage(1)
    loadTickets(1, reset)
  }

  const changePage = (newPage) => {
    setPage(newPage)
  }

  const statusLabel = (s) => {
    const map = {
      open: 'Abierto',
      in_progress: 'En Proceso',
      waiting: 'Esperando',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }
    return map[s] ?? s
  }

  const statusSeverity = (s) => {
    switch (s) {
      case 'open':
        return 'info'
      case 'in_progress':
        return 'warning'
      case 'waiting':
        return 'contrast'
      case 'resolved':
        return 'success'
      case 'closed':
        return 'secondary'
      default:
        return 'info'
    }
  }

  const priorityLabel = (p) => {
    const map = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    }
    return map[p] ?? p
  }

  const prioritySeverity = (p) => {
    switch (p) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'danger'
      case 'critical':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="tickets-view">
      {/* Header */}
      <div className="page-header">
        <div className="header-titles">
          <h1 className="page-title">Gestión de Tickets de Incidencias</h1>
          <p className="page-subtitle">
            Supervisa, clasifica y atiende los tickets reportados en la plataforma
            {pagination?.total != null && (
              <span className="total-pill">{pagination.total} tickets</span>
            )}
          </p>
        </div>

        <div className="header-actions">
          <Button
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={() => loadTickets(page, filters)}
            icon={<IconRefresh size={16} className="p-button-icon-left" />}
            label="Actualizar"
          />
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="filters-card">
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            value={filters.search}
            placeholder="Buscar por título o descripción..."
            className="search-input"
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          {filters.search && (
            <button
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
          <div className="filter-item">
            <label className="filter-label">Estado:</label>
            <select
              name="status"
              value={filters.status}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todos los estados</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En Proceso</option>
              <option value="waiting">Esperando Respuesta</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Prioridad:</label>
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
            <Button
              label="Limpiar filtros"
              severity="secondary"
              text
              size="small"
              onClick={clearFilters}
              icon={<IconFilterOff size={16} className="p-button-icon-left" />}
            />
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="table-container">
        {/* Loading Skeleton */}
        {loading ? (
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="60px" height="24px" />
                <Skeleton width="30%" height="24px" />
                <Skeleton width="90px" height="24px" />
                <Skeleton width="80px" height="24px" />
                <Skeleton width="120px" height="24px" />
                <Skeleton width="100px" height="24px" />
                <Skeleton width="70px" height="32px" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="error-container">
            <IconAlertCircle size={36} className="error-icon" />
            <div className="error-title">No fue posible cargar los tickets</div>
            <div className="error-desc">{error}</div>
            <Button
              label="Reintentar"
              severity="danger"
              size="small"
              onClick={() => loadTickets(page, filters)}
            />
          </div>
        ) : tickets.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <IconInbox size={48} strokeWidth={1.5} />
            </div>
            <h3 className="empty-title">No se encontraron tickets</h3>
            <p className="empty-desc">
              No hay incidencias que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
            {hasActiveFilters && (
              <Button
                label="Restablecer filtros"
                severity="primary"
                outlined
                size="small"
                onClick={clearFilters}
              />
            )}
          </div>
        ) : (
          /* Tabla de Datos */
          <table className="tickets-table">
            <thead>
              <tr>
                <th className="th-id">ID</th>
                <th className="th-title">Título de Incidencia</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Categoría</th>
                <th>Asignado</th>
                <th>Fecha</th>
                <th className="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="cell-id">
                    <span className="id-tag">#{t.id}</span>
                  </td>

                  <td className="cell-title">
                    <Link to={`/tickets/${t.id}`} className="title-link">
                      {t.title}
                    </Link>
                    {(t.category?.name || t.moodle_data?.course) && (
                      <div className="title-meta">
                        {t.moodle_data?.course && <span>{t.moodle_data.course}</span>}
                      </div>
                    )}
                  </td>

                  <td>
                    <Tag
                      value={statusLabel(t.status)}
                      severity={statusSeverity(t.status)}
                      rounded
                    />
                  </td>

                  <td>
                    <Tag
                      value={priorityLabel(t.priority)}
                      severity={prioritySeverity(t.priority)}
                      rounded
                    />
                  </td>

                  <td className="cell-category">
                    <span className="category-pill">
                      {t.category?.name ?? 'General'}
                    </span>
                  </td>

                  <td className="cell-assigned">
                    {t.assigned_to?.name ? (
                      <div className="assigned-user">
                        <div className="user-mini-avatar">
                          {t.assigned_to.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="user-name-text">{t.assigned_to.name}</span>
                      </div>
                    ) : (
                      <span className="unassigned-text">Sin asignar</span>
                    )}
                  </td>

                  <td className="cell-date">
                    {formatDate(t.times?.created_at)}
                  </td>

                  <td className="cell-actions">
                    <Link to={`/tickets/${t.id}`}>
                      <Button
                        label="Ver"
                        severity="secondary"
                        outlined
                        size="small"
                        icon={<IconEye size={15} className="p-button-icon-left" />}
                      />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {pagination && pagination.last_page > 1 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Página <b>{pagination.current_page}</b> de <b>{pagination.last_page}</b>
          </div>

          <div className="pagination-controls">
            <Button
              severity="secondary"
              outlined
              size="small"
              disabled={pagination.current_page <= 1}
              onClick={() => changePage(pagination.current_page - 1)}
              icon={<IconChevronLeft size={16} />}
              label="Anterior"
            />

            <Button
              severity="secondary"
              outlined
              size="small"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => changePage(pagination.current_page + 1)}
              label="Siguiente"
              icon={<IconChevronRight size={16} className="p-button-icon-right" />}
            />
          </div>
        </div>
      )}
    </div>
  )
}

