import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import {
  IconArrowLeft,
  IconFolder,
  IconCalendar,
  IconCircleCheck,
  IconSchool,
  IconHistory,
  IconUserCheck,
  IconMessageDots,
  IconDeviceFloppy,
  IconUser,
  IconMail,
  IconClock,
  IconAlertCircle,
  IconLock,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useTicketsStore } from '../../stores/ticketsStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import './TicketDetailView.css'

export default function TicketDetailView() {
  const { id } = useParams()
  const { showToast } = useToast()

  const ticket = useTicketsStore((state) => state.ticket)
  const loading = useTicketsStore((state) => state.loading)
  const error = useTicketsStore((state) => state.error)
  const fetchTicket = useTicketsStore((state) => state.fetchTicket)
  const changeStatus = useTicketsStore((state) => state.changeStatus)

  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Transiciones permitidas desde el estado actual (vienen del TicketResource via State Pattern)
  const allowedTransitions = useMemo(() => ticket?.allowed_transitions ?? [], [ticket])

  useEffect(() => {
    if (id) {
      fetchTicket(id)
    }
  }, [id, fetchTicket])

  // Pre-seleccionar la primera transición disponible cuando cambie allowedTransitions
  useEffect(() => {
    if (allowedTransitions.length > 0) {
      setNewStatus(allowedTransitions[0])
    } else {
      setNewStatus('')
    }
  }, [allowedTransitions])

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

  const roleLabel = (r) => {
    const map = {
      admin: 'Administrador',
      support: 'Soporte Técnico',
      estudiante: 'Estudiante',
      student: 'Estudiante',
      teacher: 'Docente',
    }
    return map[r] ?? r
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

  const handleStatusChange = async () => {
    if (!newStatus) return
    setActionLoading(true)

    try {
      await changeStatus(id, newStatus, statusComment)
      setStatusComment('')
      showToast({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `El ticket ahora está en estado "${statusLabel(newStatus)}"`,
        life: 3500,
      })
    } catch (e) {
      if (e.errorCode === 'invalid_state_transition') {
        const allowed = e.allowedTransitions?.length
          ? e.allowedTransitions.map(statusLabel).join(', ')
          : 'ninguno (estado final)'

        showToast({
          severity: 'error',
          summary: 'Transición No Permitida',
          detail: `No se puede cambiar de "${statusLabel(e.currentStatus)}" a "${statusLabel(
            e.targetStatus
          )}". Transiciones válidas: ${allowed}.`,
          life: 6000,
        })
      } else {
        showToast({
          severity: 'error',
          summary: 'Error al Actualizar',
          detail: e.message || 'No se pudo actualizar el estado del ticket.',
          life: 4500,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="ticket-detail-view">
      {/* Navegación superior */}
      <div className="detail-header">
        <div className="header-left">
          <Link to="/tickets" className="back-button">
            <IconArrowLeft size={18} />
            <span>Volver a la bandeja</span>
          </Link>

          {ticket && (
            <div className="ticket-header-title">
              <span className="ticket-id-badge">#{ticket.id}</span>
              <h1 className="ticket-main-title">{ticket.title}</h1>
            </div>
          )}
        </div>

        {ticket && (
          <div className="header-badges">
            <Tag
              value={statusLabel(ticket.status)}
              severity={statusSeverity(ticket.status)}
              rounded
            />
            <Tag
              value={priorityLabel(ticket.priority)}
              severity={prioritySeverity(ticket.priority)}
              rounded
            />
          </div>
        )}
      </div>

      {/* Skeleton Loading */}
      {loading ? (
        <div className="detail-layout">
          <div className="main-column">
            <div className="surface-card">
              <Skeleton width="40%" height="28px" className="mb-3" />
              <Skeleton width="100%" height="16px" className="mb-2" />
              <Skeleton width="90%" height="16px" className="mb-2" />
              <Skeleton width="75%" height="16px" />
            </div>
            <div className="surface-card">
              <Skeleton width="30%" height="24px" className="mb-3" />
              <Skeleton width="100%" height="80px" />
            </div>
          </div>
          <div className="sidebar-column">
            <div className="surface-card">
              <Skeleton width="60%" height="24px" className="mb-3" />
              <Skeleton width="100%" height="40px" className="mb-2" />
              <Skeleton width="100%" height="40px" />
            </div>
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="error-box">
          <IconAlertCircle size={36} className="error-icon" />
          <h3>No se pudo cargar la información del ticket</h3>
          <p>{error}</p>
          <Link to="/tickets">
            <Button label="Regresar a tickets" severity="secondary" size="small" />
          </Link>
        </div>
      ) : ticket ? (
        /* Contenido del Ticket */
        <div className="detail-layout">
          {/* Columna Principal */}
          <div className="main-column">
            {/* Descripción y Datos Básicos */}
            <div className="surface-card">
              <div className="card-section-header">
                <span className="section-label">DESCRIPCIÓN DE LA INCIDENCIA</span>
              </div>

              <div className="ticket-description">
                {ticket.description || 'Sin descripción detallada proporcionada.'}
              </div>

              <div className="meta-chips-grid">
                <div className="meta-chip">
                  <IconFolder size={16} className="chip-icon text-blue" />
                  <div className="chip-content">
                    <span className="chip-title">Categoría</span>
                    <span className="chip-value">
                      {ticket.category?.name ?? 'Sin categoría'}
                    </span>
                  </div>
                </div>

                <div className="meta-chip">
                  <IconCalendar size={16} className="chip-icon text-slate" />
                  <div className="chip-content">
                    <span className="chip-title">Fecha de Creación</span>
                    <span className="chip-value">
                      {formatDate(ticket.times?.created_at)}
                    </span>
                  </div>
                </div>

                <div className="meta-chip">
                  <IconCircleCheck size={16} className="chip-icon text-emerald" />
                  <div className="chip-content">
                    <span className="chip-title">Fecha de Resolución</span>
                    <span className="chip-value">
                      {formatDate(ticket.times?.resolved_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información Académica / Moodle */}
            <div className="surface-card">
              <div className="card-section-header">
                <IconSchool size={18} className="text-blue" />
                <h3 className="section-heading">Datos Académicos del Campus (Moodle)</h3>
              </div>

              <div className="moodle-grid">
                <div className="moodle-item">
                  <span className="moodle-label">ID Usuario Moodle:</span>
                  <span className="moodle-val font-mono">
                    {ticket.moodle_data?.user_id ?? '—'}
                  </span>
                </div>

                <div className="moodle-item">
                  <span className="moodle-label">Curso Asociado:</span>
                  <span className="moodle-val">
                    {ticket.moodle_data?.course ?? 'Sin curso especificado'}
                  </span>
                </div>

                <div className="moodle-item">
                  <span className="moodle-label">Rol en Plataforma:</span>
                  <span className="moodle-val highlight-role">
                    {ticket.moodle_data?.role ?? 'Estudiante'}
                  </span>
                </div>
              </div>
            </div>

            {/* Historial y Conversación (Timeline) */}
            <div className="surface-card">
              <div className="card-section-header">
                <IconHistory size={18} className="text-slate" />
                <h3 className="section-heading">Hilo de Conversación y Auditoría</h3>
              </div>

              {!ticket.history || ticket.history.length === 0 ? (
                <div className="timeline-empty">
                  <IconHistory size={24} className="text-muted" />
                  <span>No se han registrado interacciones o transiciones todavía.</span>
                </div>
              ) : (
                <div className="timeline-list">
                  {ticket.history.map((h, idx) => (
                    <div key={idx} className="timeline-row">
                      <div className="timeline-marker">
                        <div className={`marker-dot ${h.changer_role || 'system'}`} />
                        {idx < ticket.history.length - 1 && (
                          <div className="marker-line" />
                        )}
                      </div>

                      <div className="timeline-body">
                        <div className="timeline-header-meta">
                          <div className="timeline-user">
                            <IconUserCheck size={15} />
                            <b>{h.changed_by ?? 'Sistema Helpdesk'}</b>
                            {h.changer_role && (
                              <span
                                className={`role-badge role-${h.changer_role}`}
                              >
                                {roleLabel(h.changer_role)}
                              </span>
                            )}
                          </div>
                          <span className="timeline-time">
                            {formatDate(h.changed_at)}
                          </span>
                        </div>

                        <div className="timeline-transition">
                          {h.old_status && h.old_status !== h.new_status ? (
                            <>
                              <span className="status-from">
                                {statusLabel(h.old_status)}
                              </span>
                              <span className="status-arrow">→</span>
                              <span className="status-to">
                                {statusLabel(h.new_status)}
                              </span>
                            </>
                          ) : h.old_status && h.old_status === h.new_status ? (
                            <span className="status-same">
                              Mensaje en <strong>{statusLabel(h.new_status)}</strong>
                            </span>
                          ) : (
                            <span className="status-to">
                              Apertura de Ticket ({statusLabel(h.new_status)})
                            </span>
                          )}
                        </div>

                        {h.comments && (
                          <div
                            className={`timeline-comment-box box-${
                              h.changer_role || 'system'
                            }`}
                          >
                            <IconMessageDots size={15} className="comment-icon" />
                            <span className="comment-text">{h.comments}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Lateral (Sidebar de Acciones) */}
          <div className="sidebar-column">
            {/* Panel para Cambiar Estado */}
            <div className="surface-card action-panel">
              <div className="card-section-header">
                <h3 className="section-heading">Actualizar Estado</h3>
              </div>

              {/* Estado actual */}
              <div className="current-status-row">
                <span className="current-status-label">Estado actual:</span>
                <Tag
                  value={statusLabel(ticket.status)}
                  severity={statusSeverity(ticket.status)}
                  rounded
                />
              </div>

              {/* Estado final — sin transiciones posibles */}
              {allowedTransitions.length === 0 ? (
                <div className="final-state-notice">
                  <IconLock size={16} className="final-state-icon" />
                  <span>
                    Este ticket está en un estado final (
                    <strong>{statusLabel(ticket.status)}</strong>) y no admite más
                    cambios.
                  </span>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="status-select">Nuevo estado:</label>
                    <select
                      id="status-select"
                      value={newStatus}
                      className="select-field"
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option disabled value="">
                        — Seleccionar destino —
                      </option>
                      {allowedTransitions.map((key) => (
                        <option key={key} value={key}>
                          {statusLabel(key)}
                        </option>
                      ))}
                    </select>
                    <p className="allowed-hint">
                      <IconInfoCircle size={13} />
                      Solo se muestran los estados válidos desde{' '}
                      <em>{statusLabel(ticket.status)}</em>.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="status-comment">Comentario o motivo:</label>
                    <textarea
                      id="status-comment"
                      value={statusComment}
                      className="textarea-field"
                      rows={3}
                      placeholder="Ej. Se reestableció el acceso al aula virtual..."
                      onChange={(e) => setStatusComment(e.target.value)}
                    />
                  </div>

                  <Button
                    label="Guardar Estado"
                    severity="primary"
                    className="w-full"
                    loading={actionLoading}
                    disabled={!newStatus}
                    onClick={handleStatusChange}
                    icon={<IconDeviceFloppy size={16} className="p-button-icon-left" />}
                  />
                </>
              )}
            </div>

            {/* Agente Asignado */}
            <div className="surface-card">
              <div className="card-section-header">
                <IconUser size={17} className="text-blue" />
                <h3 className="section-heading">Técnico Asignado</h3>
              </div>

              {ticket.assigned_to ? (
                <div className="assigned-profile">
                  <div className="profile-avatar">
                    {ticket.assigned_to.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{ticket.assigned_to.name}</div>
                    <div className="profile-email">
                      <IconMail size={13} />
                      <span>{ticket.assigned_to.email}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="unassigned-profile">
                  <span>Ticket pendiente de asignación técnica</span>
                </div>
              )}
            </div>

            {/* Métricas SLA & Tiempos */}
            <div className="surface-card">
              <div className="card-section-header">
                <IconClock size={17} className="text-amber" />
                <h3 className="section-heading">Tiempos de Atención</h3>
              </div>

              <div className="sla-list">
                <div className="sla-row">
                  <span className="sla-label">1ª Respuesta:</span>
                  <span className="sla-val">
                    {formatDate(ticket.times?.first_response_at)}
                  </span>
                </div>
                <div className="sla-row">
                  <span className="sla-label">Resolución:</span>
                  <span className="sla-val">
                    {formatDate(ticket.times?.resolved_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
