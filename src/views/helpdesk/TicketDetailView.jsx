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
  IconArrowsExchange,
  IconAlertTriangle,
  IconX,
} from '@tabler/icons-react'
import { useTicketsStore } from '../../stores/ticketsStore.js'
import { getEligibleAgents } from '../../api/tickets.js'
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
  const reassign = useTicketsStore((state) => state.reassign)

  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Estados para Modal de Reasignación Especializada
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [eligibleAgents, setEligibleAgents] = useState([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState(null)
  const [reassignComment, setReassignComment] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [reassignError, setReassignError] = useState('')

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

  const statusSeverity = (s) => {
    switch (s) {
      case 'EN_ESPERA':
      case 'open':
        return 'info'
      case 'CLIENTE_ESPERANDO_RESPUESTA':
      case 'in_progress':
        return 'warning'
      case 'ESPERANDO_POR_CLIENTE':
      case 'waiting':
        return 'contrast'
      case 'RESUELTO':
      case 'resolved':
        return 'success'
      case 'CERRADO':
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
    return map[p?.toLowerCase?.()] ?? p
  }

  const prioritySeverity = (p) => {
    switch (p?.toLowerCase?.()) {
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
      DIRECTOR: 'Director / Administrador',
      TECNICO: 'Soporte Técnico',
      DOCENTE: 'Docente',
      ESTUDIANTE: 'Estudiante',
      VISITANTE: 'Visitante Externo',
      admin: 'Director / Administrador',
      support: 'Soporte Técnico',
      student: 'Estudiante',
      teacher: 'Docente',
    }
    return map[r] ?? (r || 'Usuario')
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

  const tierLabel = (t) => {
    const map = {
      1: 'Básico',
      2: 'Intermedio',
      3: 'Especialista',
    }
    return map[t] ?? 'Básico'
  }

  const openReassignModal = async () => {
    setIsReassignModalOpen(true)
    setReassignError('')
    setReassignComment('')
    setSelectedAgentId(null)
    setLoadingEligible(true)

    try {
      const { data } = await getEligibleAgents(id)
      const list = data.data || []
      setEligibleAgents(list)
      // Pre-seleccionar el primer candidato si hay opciones y no es el asignado actual
      const firstAvailable = list.find((a) => !a.is_current_assignee)
      if (firstAvailable) {
        setSelectedAgentId(firstAvailable.id)
      } else if (list.length > 0) {
        setSelectedAgentId(list[0].id)
      }
    } catch (err) {
      setReassignError(
        err.response?.data?.message || 'Error al cargar técnicos elegibles para este ticket.'
      )
    } finally {
      setLoadingEligible(false)
    }
  }

  const handleConfirmReassign = async () => {
    if (!selectedAgentId) return
    setReassigning(true)
    setReassignError('')

    try {
      await reassign(id, selectedAgentId, reassignComment)
      const chosen = eligibleAgents.find((a) => a.id === selectedAgentId)
      showToast({
        severity: 'success',
        summary: 'Ticket Reasignado',
        detail: `El ticket ahora está a cargo de "${chosen ? chosen.name : 'nuevo técnico'}".`,
        life: 3500,
      })
      setIsReassignModalOpen(false)
    } catch (err) {
      setReassignError(
        err.message || err.response?.data?.message || 'Error al reasignar el ticket.'
      )
    } finally {
      setReassigning(false)
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
              <span className="ticket-id-badge">{ticket.codigo || `#${ticket.id}`}</span>
              <h1 className="ticket-main-title">{ticket.asunto || ticket.title}</h1>
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
                {ticket.descripcion || ticket.description || 'Sin descripción detallada proporcionada.'}
              </div>

              <div className="meta-chips-grid">
                <div className="meta-chip">
                  <IconFolder size={16} className="chip-icon text-blue" />
                  <div className="chip-content">
                    <span className="chip-title">Categoría(s)</span>
                    <span className="chip-value">
                      {ticket.categorias && ticket.categorias.length > 0
                        ? ticket.categorias.map((c) => c.nombre || c.name).join(', ')
                        : ticket.category?.nombre || ticket.category?.name || 'General'}
                    </span>
                  </div>
                </div>

                <div className="meta-chip">
                  <IconCalendar size={16} className="chip-icon text-slate" />
                  <div className="chip-content">
                    <span className="chip-title">Fecha de Apertura</span>
                    <span className="chip-value">
                      {formatDate(ticket.fecha_creacion || ticket.times?.created_at)}
                    </span>
                  </div>
                </div>

                <div className="meta-chip">
                  <IconClock size={16} className="chip-icon text-amber" />
                  <div className="chip-content">
                    <span className="chip-title">1ª Respuesta (FRT)</span>
                    <span className="chip-value">
                      {formatDate(ticket.fecha_respuesta || ticket.times?.first_response_at)}
                    </span>
                  </div>
                </div>

                <div className="meta-chip">
                  <IconCircleCheck size={16} className="chip-icon text-emerald" />
                  <div className="chip-content">
                    <span className="chip-title">Fecha de Resolución</span>
                    <span className="chip-value">
                      {formatDate(ticket.fecha_resuelto || ticket.times?.resolved_at)}
                    </span>
                  </div>
                </div>

                {ticket.correo_hilo && (
                  <div className="meta-chip">
                    <IconMail size={16} className="chip-icon text-purple" />
                    <div className="chip-content">
                      <span className="chip-title">Hilo de Correo</span>
                      <span className="chip-value font-mono text-xs">{ticket.correo_hilo}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Solicitante / Moodle */}
            <div className="surface-card">
              <div className="card-section-header">
                <IconSchool size={18} className="text-blue" />
                <h3 className="section-heading">Datos del Solicitante (Moodle / Campus)</h3>
              </div>

              <div className="moodle-grid">
                <div className="moodle-item">
                  <span className="moodle-label">Nombre del Solicitante:</span>
                  <span className="moodle-val font-semibold">
                    {ticket.solicitante?.name ||
                      `${ticket.solicitante?.nombre || ''} ${ticket.solicitante?.apellido || ''}`.trim() ||
                      ticket.created_by?.name ||
                      'Usuario Moodle'}
                  </span>
                </div>

                <div className="moodle-item">
                  <span className="moodle-label">Correo Institucional:</span>
                  <span className="moodle-val">
                    {ticket.solicitante?.correo || ticket.solicitante?.email || ticket.created_by?.email || '—'}
                  </span>
                </div>

                <div className="moodle-item">
                  <span className="moodle-label">ID Usuario Moodle:</span>
                  <span className="moodle-val font-mono">
                    {ticket.solicitante?.moodle_user_id || ticket.moodle_data?.user_id || '—'}
                  </span>
                </div>

                <div className="moodle-item">
                  <span className="moodle-label">Rol Institucional:</span>
                  <span className="moodle-val highlight-role">
                    {roleLabel(ticket.solicitante?.rol || ticket.created_by?.rol || ticket.moodle_data?.role)}
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
                    icon={<IconDeviceFloppy size={16} />}
                  />
                </>
              )}
            </div>

            {/* Agente Asignado */}
            <div className="surface-card">
              <div className="card-section-header flex-between">
                <div className="header-title-group">
                  <IconUser size={17} className="text-blue" />
                  <h3 className="section-heading">Técnico Asignado</h3>
                </div>
                <button
                  type="button"
                  className="btn-reassign-badge"
                  onClick={openReassignModal}
                  title="Reasignar ticket a otro técnico especializado"
                >
                  <IconArrowsExchange size={14} />
                  <span>Reasignar</span>
                </button>
              </div>

              {ticket.tecnico_asignado || ticket.assigned_to ? (
                <div className="assigned-profile">
                  <div className="profile-avatar">
                    {(
                      ticket.tecnico_asignado?.nombre ||
                      ticket.tecnico_asignado?.name ||
                      ticket.assigned_to?.name ||
                      'T'
                    ).charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">
                      {ticket.tecnico_asignado?.name ||
                        `${ticket.tecnico_asignado?.nombre || ''} ${ticket.tecnico_asignado?.apellido || ''}`.trim() ||
                        ticket.assigned_to?.name}
                    </div>
                    <div className="profile-email">
                      <IconMail size={13} />
                      <span>
                        {ticket.tecnico_asignado?.correo ||
                          ticket.tecnico_asignado?.email ||
                          ticket.assigned_to?.email}
                      </span>
                    </div>
                    <div className="profile-badge-sub">
                      {roleLabel(ticket.tecnico_asignado?.rol || 'TECNICO')}
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
                <h3 className="section-heading">Tiempos de Atención (SLA)</h3>
              </div>

              <div className="sla-list">
                <div className="sla-row">
                  <span className="sla-label">1ª Respuesta (FRT):</span>
                  <span className="sla-val">
                    {formatDate(ticket.fecha_respuesta || ticket.times?.first_response_at)}
                  </span>
                </div>
                <div className="sla-row">
                  <span className="sla-label">Resolución (MTTR):</span>
                  <span className="sla-val">
                    {formatDate(ticket.fecha_resuelto || ticket.times?.resolved_at)}
                  </span>
                </div>
                {ticket.fecha_cierre && (
                  <div className="sla-row">
                    <span className="sla-label">Cierre Definitivo:</span>
                    <span className="sla-val">
                      {formatDate(ticket.fecha_cierre)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de Reasignación de Técnico Especializado */}
      {isReassignModalOpen && (
        <div
          className="reassign-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReassignModalOpen(false)
          }}
        >
          <div className="reassign-modal-card">
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title">Reasignar Técnico Especializado</h2>
                <span className="modal-subtitle">
                  Ticket {ticket.codigo || `#${ticket.id}`}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsReassignModalOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="reassign-modal-body">
              {/* Condiciones Requeridas por el Ticket */}
              <div className="reassign-conditions-box">
                <div className="condition-item">
                  <span className="condition-label">Categoría requerida:</span>
                  <span className="condition-badge cat-badge">
                    {ticket.categorias && ticket.categorias.length > 0
                      ? ticket.categorias.map((c) => c.nombre || c.name).join(', ')
                      : ticket.category?.nombre || ticket.category?.name || 'General'}
                  </span>
                </div>
                <div className="condition-item">
                  <span className="condition-label">Prioridad del caso:</span>
                  <Tag
                    value={priorityLabel(ticket.prioridad?.codigo || ticket.priority)}
                    severity={prioritySeverity(ticket.prioridad?.codigo || ticket.priority)}
                    rounded
                  />
                </div>
              </div>

              {/* Lista de Técnicos Elegibles */}
              <div className="eligible-agents-section">
                <div className="section-label-row">
                  <span className="section-subheading">Técnicos calificados disponibles:</span>
                  {!loadingEligible && (
                    <span className="eligible-count-badge">
                      {eligibleAgents.length} disponibles
                    </span>
                  )}
                </div>

                {loadingEligible ? (
                  <div className="reassign-loading">
                    <Skeleton width="100%" height="64px" className="mb-2" />
                    <Skeleton width="100%" height="64px" />
                  </div>
                ) : reassignError && eligibleAgents.length === 0 ? (
                  <div className="reassign-error-box">
                    <IconAlertCircle size={22} className="text-danger" />
                    <span>{reassignError}</span>
                  </div>
                ) : eligibleAgents.length === 0 ? (
                  <div className="empty-eligible-box">
                    <IconAlertTriangle size={28} className="text-amber" />
                    <div className="empty-eligible-text">
                      <b>No hay técnicos disponibles para este perfil</b>
                      <p>
                        Ningún agente activo tiene designada simultáneamente la categoría "
                        {ticket.category?.name || 'N/A'}" y la prioridad "{priorityLabel(ticket.priority)}".
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="agents-selectable-list">
                    {eligibleAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`agent-select-card ${
                          selectedAgentId === agent.id ? 'selected' : ''
                        } ${agent.is_current_assignee ? 'is-current' : ''}`}
                        onClick={() => setSelectedAgentId(agent.id)}
                      >
                        <div className="agent-radio-indicator">
                          <div
                            className={`radio-dot ${
                              selectedAgentId === agent.id ? 'checked' : ''
                            }`}
                          />
                        </div>

                        <div className="agent-avatar">
                          {agent.name?.charAt(0).toUpperCase()}
                        </div>

                        <div className="agent-card-info">
                          <div className="agent-card-top">
                            <span className="agent-card-name">{agent.name}</span>
                            {agent.is_current_assignee && (
                              <span className="current-pill">Asignado actual</span>
                            )}
                            {/* <span className={`tier-badge tier-${agent.tier_level}`}>
                              Tier {agent.tier_level} ({tierLabel(agent.tier_level)})
                            </span> */}
                          </div>

                          <span className="agent-card-email">{agent.email}</span>

                          <div className="agent-card-meta">
                            <span className="workload-text">
                              Carga activa: <b>{agent.assigned_tickets_count}</b> / máx{' '}
                              {agent.max_active_tickets}
                            </span>
                            {agent.department && (
                              <span className="meta-department">
                                • {agent.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comentario de Reasignación */}
              <div className="form-group mt-3">
                <label className="form-label" htmlFor="reassign-comment">
                  Motivo o comentario de la reasignación (opcional):
                </label>
                <textarea
                  id="reassign-comment"
                  value={reassignComment}
                  rows={2}
                  className="textarea-field"
                  placeholder="Ej. Se deriva por especialidad técnica en configuración del campus..."
                  onChange={(e) => setReassignComment(e.target.value)}
                />
              </div>

              {reassignError && eligibleAgents.length > 0 && (
                <div className="reassign-error-alert">
                  <IconAlertCircle size={16} />
                  <span>{reassignError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={reassigning}
                onClick={() => setIsReassignModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!selectedAgentId || reassigning || eligibleAgents.length === 0}
                onClick={handleConfirmReassign}
              >
                <IconArrowsExchange size={16} />
                <span>
                  {reassigning ? 'Reasignando...' : 'Confirmar Reasignación'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

