import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import { Dialog } from 'primereact/dialog'
import {
  IconRobot,
  IconUser,
  IconBolt,
  IconCalendar,
  IconFilterOff,
  IconRefresh,
  IconEye,
  IconCheck,
  IconArrowBackUp,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { getBotInteractions } from '../../api/botInteractions.js'
import './BotHistoryView.css'

export default function BotHistoryView() {
  const [interactions, setInteractions] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ resolved: '', date_from: '', date_to: '' })

  // Modal de detalle
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const hasActiveFilters = useMemo(() => {
    return (
      filters.resolved !== '' ||
      filters.date_from !== '' ||
      filters.date_to !== ''
    )
  }, [filters])

  const loadData = useCallback(
    async (targetPage = page, currentFilters = filters) => {
      setLoading(true)
      try {
        const params = { page: targetPage }
        if (currentFilters.resolved !== '') params.resolved = currentFilters.resolved
        if (currentFilters.date_from) params.date_from = currentFilters.date_from
        if (currentFilters.date_to) params.date_to = currentFilters.date_to

        const { data } = await getBotInteractions(params)
        setInteractions(data.data || [])
        setMeta({
          current_page: data.current_page,
          last_page: data.last_page,
        })
      } catch (err) {
        console.error('Error al cargar historial del bot', err)
      } finally {
        setLoading(false)
      }
    },
    [page, filters]
  )

  useEffect(() => {
    loadData(page, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)
    setPage(1)
    loadData(1, nextFilters)
  }

  const clearFilters = () => {
    const reset = { resolved: '', date_from: '', date_to: '' }
    setFilters(reset)
    setPage(1)
    loadData(1, reset)
  }

  const changePage = (newPage) => {
    setPage(newPage)
  }

  const openDetail = (item) => {
    setSelectedItem(item)
    setDetailVisible(true)
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
    <div className="bot-history-view">
      {/* Header */}
      <div className="page-header">
        <div className="header-titles">
          <div className="title-with-badge">
            <h1 className="page-title">Historial de Interacciones del Bot</h1>
          </div>
          <p className="page-subtitle">
            Supervisa las conversaciones, precisión de intenciones y resoluciones autónomas del asistente virtual
          </p>
        </div>

        <div className="header-actions">
          <Button
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={() => loadData(page, filters)}
            icon={<IconRefresh size={16} />}
            label="Actualizar"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-card">
        <div className="filter-item">
          <label className="filter-label">Resultado:</label>
          <select
            name="resolved"
            value={filters.resolved}
            className="custom-select"
            onChange={handleFilterChange}
          >
            <option value="">Todos los resultados</option>
            <option value="1">Resueltos por Bot</option>
            <option value="0">Escalados a Humano</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-label">Desde:</label>
          <div className="input-date-wrap">
            <input
              name="date_from"
              value={filters.date_from}
              type="date"
              className="custom-date-input"
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="filter-item">
          <label className="filter-label">Hasta:</label>
          <div className="input-date-wrap">
            <input
              name="date_to"
              value={filters.date_to}
              type="date"
              className="custom-date-input"
              onChange={handleFilterChange}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            label="Limpiar filtros"
            severity="secondary"
            text
            size="small"
            onClick={clearFilters}
            icon={<IconFilterOff size={16} />}
          />
        )}
      </div>

      {/* Tabla */}
      <div className="table-container">
        {/* Loading Skeleton */}
        {loading ? (
          <div className="skeleton-wrapper">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row">
                <Skeleton width="50px" height="24px" />
                <Skeleton width="30%" height="24px" />
                <Skeleton width="120px" height="24px" />
                <Skeleton width="25%" height="24px" />
                <Skeleton width="70px" height="24px" />
                <Skeleton width="110px" height="24px" />
                <Skeleton width="80px" height="32px" />
              </div>
            ))}
          </div>
        ) : interactions.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <IconRobot size={48} strokeWidth={1.5} />
            </div>
            <h3 className="empty-title">Sin interacciones registradas</h3>
            <p className="empty-desc">
              No se encontraron registros de conversaciones con el bot que coincidan con los filtros actuales.
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
          /* Tabla con datos */
          <table className="bot-table">
            <thead>
              <tr>
                <th className="th-id">ID</th>
                <th className="th-query">Consulta del Usuario</th>
                <th>Intención (NLP)</th>
                <th className="th-response">Respuesta Generada</th>
                <th>Tiempo</th>
                <th>Resultado</th>
                <th>Fecha</th>
                <th className="th-action">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {interactions.map((item) => (
                <tr
                  key={item.id}
                  className="table-row"
                  onClick={() => openDetail(item)}
                >
                  <td className="cell-id">
                    <span className="id-tag">#{item.id}</span>
                  </td>

                  <td className="cell-query" title={item.query}>
                    <div className="query-content">
                      <IconUser size={15} className="row-user-icon" />
                      <span className="truncate-text">{item.query}</span>
                    </div>
                  </td>

                  <td className="cell-intent">
                    <span className="intent-pill">
                      {item.intent || 'Desconocido'}
                    </span>
                  </td>

                  <td className="cell-response" title={item.response}>
                    <div className="response-content">
                      <IconRobot size={15} className="row-bot-icon" />
                      <span className="truncate-text">{item.response}</span>
                    </div>
                  </td>

                  <td className="cell-time">
                    <span className="time-badge">
                      <IconBolt size={13} />
                      {item.resolution_time_seconds}s
                    </span>
                  </td>

                  <td>
                    <Tag
                      value={item.resolved ? 'Resuelto por Bot' : 'Escalado a Humano'}
                      severity={item.resolved ? 'success' : 'warning'}
                      rounded
                      icon={
                        item.resolved ? (
                          <IconCheck size={13} className="tag-inline-icon" />
                        ) : (
                          <IconArrowBackUp size={13} className="tag-inline-icon" />
                        )
                      }
                    />
                  </td>

                  <td className="cell-date">
                    {formatDate(item.created_at)}
                  </td>

                  <td className="cell-action" onClick={(e) => e.stopPropagation()}>
                    <Button
                      severity="secondary"
                      outlined
                      size="small"
                      title="Ver conversación completa"
                      onClick={() => openDetail(item)}
                      icon={<IconEye size={15} />}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Página <b>{meta.current_page}</b> de <b>{meta.last_page}</b>
          </div>

          <div className="pagination-controls">
            <Button
              severity="secondary"
              outlined
              size="small"
              disabled={meta.current_page <= 1}
              onClick={() => changePage(meta.current_page - 1)}
              icon={<IconChevronLeft size={16} />}
              label="Anterior"
            />

            <Button
              severity="secondary"
              outlined
              size="small"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => changePage(meta.current_page + 1)}
              label="Siguiente"
              icon={<IconChevronRight size={16} />}
              iconPos="right"
            />
          </div>
        </div>
      )}

      {/* Modal Dialog para Detalle Completo de Interacción */}
      <Dialog
        visible={detailVisible}
        onHide={() => setDetailVisible(false)}
        modal
        header="Detalle de Interacción con el Asistente"
        style={{ width: '640px', maxWidth: '95vw' }}
      >
        {selectedItem && (
          <div className="bot-detail-content">
            {/* Barra de estado superior del modal */}
            <div className="bot-detail-status-bar">
              <Tag
                value={
                  selectedItem.resolved
                    ? 'Resuelto por Asistente'
                    : 'Escalado a Agente Humano'
                }
                severity={selectedItem.resolved ? 'success' : 'warning'}
                rounded
              />

              <div className="bot-detail-meta-chips">
                <span className="bot-detail-meta-chip">
                  <IconBolt size={14} className="text-amber" />
                  <b>{selectedItem.resolution_time_seconds} seg</b>
                </span>
                <span className="bot-detail-meta-chip">
                  <IconCalendar size={14} className="text-slate" />
                  {formatDate(selectedItem.created_at)}
                </span>
              </div>
            </div>

            {/* Consulta del usuario */}
            <div className="dialog-bubble user-bubble">
              <div className="bubble-header">
                <div className="bubble-user-badge">
                  <IconUser size={16} />
                  <span>Pregunta del Usuario</span>
                </div>
                <span className="bubble-time">#{selectedItem.id}</span>
              </div>
              <div className="bubble-text">
                {selectedItem.query}
              </div>
            </div>

            {/* Intención Detectada */}
            <div className="intent-info-box">
              <div className="intent-title">
                <IconSparkles size={16} className="text-purple" />
                <span>Intención clasificada por NLP:</span>
              </div>
              <span className="intent-tag-lg">
                {selectedItem.intent || 'No determinada'}
              </span>
            </div>

            {/* Respuesta del Bot */}
            <div className="dialog-bubble bot-bubble">
              <div className="bubble-header">
                <div className="bubble-bot-badge">
                  <IconRobot size={16} />
                  <span>Respuesta del Asistente Virtual</span>
                </div>
              </div>
              <div className="bubble-text">
                {selectedItem.response}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

