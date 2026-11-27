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
  IconCheck,
  IconChartBar,
  IconTarget,
  IconBolt,
  IconAward,
} from '@tabler/icons-react'
import { useTicketsStore } from '../../stores/ticketsStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { isAdmin } from '../../utils/permissions.js'
import { getEligibleAgents } from '../../api/tickets.js'
import { useToast } from '../../context/ToastContext.jsx'
import TicketWaitingHours from '../../components/TicketWaitingHours.jsx'
import TicketConversation from '../../components/TicketConversation.jsx'
import {
  EscalationButton,
  EscalationBanner,
  EscalationModals,
  CargoActualLine,
  isEscalationHistory,
} from '../../components/TicketEscalation.jsx'
import {
  createReassignTicketSchema,
  rejectReassignmentSchema,
  ticketStatusUpdateSchema,
  validateSchema,
} from '../../schemas/index.js'
import './TicketDetailView.css'

export default function TicketDetailView() {
  const { id } = useParams()
  const { showToast } = useToast()

  const ticket = useTicketsStore((state) => state.ticket)
  const loading = useTicketsStore((state) => state.loading)
  const error = useTicketsStore((state) => state.error)
  const fetchTicket = useTicketsStore((state) => state.fetchTicket)
  const changeStatus = useTicketsStore((state) => state.changeStatus)
  const replyTicket = useTicketsStore((state) => state.replyTicket)
  const reassign = useTicketsStore((state) => state.reassign)
  const approveReassignment = useTicketsStore((state) => state.approveReassignment)
  const rejectReassignment = useTicketsStore((state) => state.rejectReassignment)

  const currentUser = useAuthStore((state) => state.user)
  const userIsAdmin = useMemo(() => isAdmin(currentUser), [currentUser])

  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [statusFieldErrors, setStatusFieldErrors] = useState({})
  const [actionLoading, setActionLoading] = useState(false)

  // Estados para Modal de Reasignación Especializada
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [eligibleAgents, setEligibleAgents] = useState([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState(null)
  const [reassignComment, setReassignComment] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [reassignError, setReassignError] = useState('')
  const [reassignFieldErrors, setReassignFieldErrors] = useState({})

  // Relevamiento vertical: 'escalate' | 'return' | null
  const [escalationMode, setEscalationMode] = useState(null)

  // Estados para Aprobación / Rechazo de Reasignación (Admin)
  const [approving, setApproving] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')
  const [rejectFieldErrors, setRejectFieldErrors] = useState({})

  // Transiciones permitidas desde el estado actual (vienen del TicketResource via State Pattern)
  const allowedTransitions = useMemo(() => ticket?.allowed_transitions ?? [], [ticket])

  // Indica si el ticket está en estado Resuelto o Cerrado (no permite reasignación)
  const isTicketClosedOrResolved = useMemo(() => {
    if (!ticket) return false
    const state = String(ticket.estado || ticket.status || '').trim().toLowerCase()
    return (
      state === 'resuelto' ||
      state === 'resolved' ||
      state === 'cerrado' ||
      state === 'closed'
    )
  }, [ticket])

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

  // Helper para determinar si el ticket se encuentra en estado de Espera
  const isWaitingState = (t) => {
    if (!t) return false
    const state = String(t.estado || t.status || '').trim().toLowerCase()
    return (
      state === 'en_espera' ||
      state === 'open' ||
      state === 'cliente_esperando_respuesta' ||
      state === 'waiting'
    )
  }

  // Cálculo de horas sin responder para el ticket en estado de espera
  const calculateWaitingHoursText = () => {
    if (!isWaitingState(ticket)) return null
    const createdRaw = ticket.fecha_creacion
    if (!createdRaw) return null
    const createdAt = new Date(createdRaw)
    if (isNaN(createdAt.getTime())) return null
    const diffMs = Math.max(0, new Date().getTime() - createdAt.getTime())
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours} hs ${minutes > 0 ? `${minutes} min` : ''}`
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
    const validation = validateSchema(ticketStatusUpdateSchema, {
      status: newStatus,
      comments: statusComment,
    })
    if (!validation.success) {
      setStatusFieldErrors(validation.fieldErrors)
      return
    }

    setStatusFieldErrors({})
    setActionLoading(true)

    try {
      await changeStatus(id, validation.data.status, validation.data.comments)
      setStatusComment('')
      showToast({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `El ticket ahora está en estado "${statusLabel(validation.data.status)}"`,
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

  const handleReply = async (mensaje, nextStatus) => {
    const res = await replyTicket(id, mensaje, nextStatus)
    const change = res.status_change
    const statusText = change?.changed
      ? ` El ticket pasó a "${statusLabel(change.to)}".`
      : ''

    if (res.email?.sent) {
      showToast({
        severity: 'success',
        summary: 'Respuesta Enviada',
        detail: `La respuesta se envió por correo.${statusText}`,
        life: 4000,
      })
    } else {
      showToast({
        severity: 'warn',
        summary: 'Respuesta Registrada',
        detail: `La respuesta se guardó, pero no se pudo enviar el correo${
          res.email?.error ? ` (${res.email.error})` : ''
        }.${statusText}`,
        life: 7000,
      })
    }
    return res
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
    if (isTicketClosedOrResolved) {
      showToast({
        severity: 'warn',
        summary: 'Reasignación no permitida',
        detail: 'No se puede reasignar un ticket en estado Resuelto o Cerrado.',
        life: 4000,
      })
      return
    }
    setIsReassignModalOpen(true)
    setReassignError('')
    setReassignFieldErrors({})
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
    const schema = createReassignTicketSchema(userIsAdmin)
    const validation = validateSchema(schema, {
      assigned_to: selectedAgentId,
      comments: reassignComment,
    })
    if (!validation.success) {
      setReassignFieldErrors(validation.fieldErrors)
      setReassignError(validation.firstError)
      return
    }

    setReassigning(true)
    setReassignError('')
    setReassignFieldErrors({})

    try {
      await reassign(id, validation.data.assigned_to, validation.data.comments)
      const chosen = eligibleAgents.find((a) => a.id === validation.data.assigned_to)
      const agentName = chosen ? chosen.name : 'técnico seleccionado'

      if (userIsAdmin) {
        showToast({
          severity: 'success',
          summary: 'Reasignación Exitosa',
          detail: `Ticket reasignado directamente a "${agentName}".`,
          life: 4000,
        })
      } else {
        showToast({
          severity: 'info',
          summary: 'Solicitud Enviada',
          detail: `Se envió la solicitud de reasignación a "${agentName}" para aprobación de tu superior jerárquico.`,
          life: 5000,
        })
      }
      setIsReassignModalOpen(false)
    } catch (err) {
      setReassignError(
        err.message || err.response?.data?.message || 'Error al procesar la reasignación.'
      )
    } finally {
      setReassigning(false)
    }
  }

  const handleApproveReassignment = async () => {
    if (!ticket?.pending_reassignment) return
    setApproving(true)
    try {
      await approveReassignment(ticket.id, ticket.pending_reassignment.id, 'Aprobada por la Dirección.')
      showToast({
        severity: 'success',
        summary: 'Reasignación Aprobada',
        detail: `Se autorizó la reasignación del caso a "${ticket.pending_reassignment.tecnico_propuesto?.name}".`,
        life: 4000,
      })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error al autorizar',
        detail: err.message || err.response?.data?.message || 'No se pudo aprobar la reasignación.',
        life: 4000,
      })
    } finally {
      setApproving(false)
    }
  }

  const handleOpenRejectModal = () => {
    setRejectReason('')
    setRejectError('')
    setRejectFieldErrors({})
    setIsRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!ticket?.pending_reassignment) return
    const validation = validateSchema(rejectReassignmentSchema, { reason: rejectReason })
    if (!validation.success) {
      setRejectFieldErrors(validation.fieldErrors)
      setRejectError(validation.firstError)
      return
    }

    setRejecting(true)
    setRejectError('')
    setRejectFieldErrors({})
    try {
      await rejectReassignment(ticket.id, ticket.pending_reassignment.id, validation.data.reason)
      showToast({
        severity: 'warn',
        summary: 'Solicitud Rechazada',
        detail: 'La solicitud de reasignación fue rechazada exitosamente.',
        life: 4000,
      })
      setIsRejectModalOpen(false)
    } catch (err) {
      setRejectError(err.message || err.response?.data?.message || 'Error al rechazar la solicitud.')
    } finally {
      setRejecting(false)
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

            {/* Respuestas por correo */}
            <TicketConversation
              ticket={ticket}
              currentUser={currentUser}
              onReply={handleReply}
              statusLabel={statusLabel}
              formatDate={formatDate}
            />

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
                            } ${isEscalationHistory(h.comments) ? 'is-escalation' : ''}`}
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

              {/* Prioridad */}
              <div className="current-status-row">
                <span className="current-status-label">Prioridad:</span>
                <Tag
                  value={priorityLabel(ticket.priority)}
                  severity={prioritySeverity(ticket.priority)}
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
                    {/* <p className="allowed-hint">
                      <IconInfoCircle size={13} />
                      Solo se muestran los estados válidos desde{' '}
                      <em>{statusLabel(ticket.status)}</em>.
                    </p> */}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="status-comment">Comentario o motivo:</label>
                    <textarea
                      id="status-comment"
                      value={statusComment}
                      className={`textarea-field ${statusFieldErrors.comments ? 'input-invalid' : ''}`}
                      aria-invalid={Boolean(statusFieldErrors.comments)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Ej. Se reestableció el acceso al aula virtual..."
                      onChange={(e) => {
                        setStatusComment(e.target.value)
                        if (statusFieldErrors.comments) {
                          setStatusFieldErrors((prev) => ({ ...prev, comments: '' }))
                        }
                      }}
                    />
                    {statusFieldErrors.comments && (
                      <span className="field-error-text">{statusFieldErrors.comments}</span>
                    )}
                    {statusFieldErrors.status && (
                      <span className="field-error-text">{statusFieldErrors.status}</span>
                    )}
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

            {/* Banner de Solicitud de Reasignación Pendiente */}
            {ticket.pending_reassignment && (
              <div className={`pending-reassign-banner ${ticket.pending_reassignment.can_resolve ? 'is-admin' : 'is-support'}`}>
                <div className="banner-top-row">
                  <div className="banner-title-wrap">
                    {ticket.pending_reassignment.can_resolve ? (
                      <IconAlertTriangle size={18} className="banner-icon-warning" />
                    ) : (
                      <IconClock size={18} className="banner-icon-info" />
                    )}
                    <span className="banner-title-text">
                      {ticket.pending_reassignment.can_resolve
                        ? 'Solicitud de Reasignación Pendiente'
                        : 'Solicitud de Reasignación en Revisión'}
                    </span>
                  </div>
                  <span className="banner-tag-pending">PENDIENTE</span>
                </div>

                <div className="banner-details-grid">
                  <div className="banner-detail-item">
                    <span className="b-label">Solicitado por:</span>
                    <span className="b-val">{ticket.pending_reassignment.solicitante?.name || 'Técnico de soporte'}</span>
                  </div>
                  <div className="banner-detail-item">
                    <span className="b-label">Técnico propuesto:</span>
                    <span className="b-val highlight-agent">{ticket.pending_reassignment.tecnico_propuesto?.name}</span>
                  </div>
                  <div className="banner-detail-item full-width">
                    <span className="b-label">Justificación técnica:</span>
                    <span className="b-val motive-quote">"{ticket.pending_reassignment.motivo}"</span>
                  </div>
                  <div className="banner-detail-item full-width">
                    <span className="b-label">Fecha de solicitud:</span>
                    <span className="b-val">{formatDate(ticket.pending_reassignment.fecha_solicitud)}</span>
                  </div>
                  {ticket.pending_reassignment.aprobadores?.length > 0 && (
                    <div className="banner-detail-item full-width">
                      <span className="b-label">Puede aprobar (superior jerárquico):</span>
                      <span className="b-val">
                        {ticket.pending_reassignment.aprobadores
                          .map((a) => (a.cargo ? `${a.name} (${a.cargo})` : a.name))
                          .join(' · ')}
                      </span>
                    </div>
                  )}
                </div>

                {ticket.pending_reassignment.can_resolve ? (
                  <div className="banner-admin-actions">
                    <button
                      type="button"
                      className="btn-approve-banner"
                      disabled={approving || rejecting || isTicketClosedOrResolved}
                      onClick={handleApproveReassignment}
                      title={
                        isTicketClosedOrResolved
                          ? 'No se puede aprobar la reasignación en un ticket Resuelto o Cerrado'
                          : 'Autorizar la transferencia al técnico propuesto'
                      }
                    >
                      <IconCheck size={16} />
                      <span>{approving ? 'Aprobando...' : 'Aprobar Reasignación'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-reject-banner"
                      disabled={approving || rejecting}
                      onClick={handleOpenRejectModal}
                      title="Rechazar la solicitud de cambio"
                    >
                      <IconX size={16} />
                      <span>Rechazar</span>
                    </button>
                  </div>
                ) : (
                  <div className="banner-support-footer">
                    <IconInfoCircle size={14} />
                    <span>
                      {userIsAdmin
                        ? 'Esta solicitud la resuelve el superior jerárquico del técnico solicitante.'
                        : 'Tu solicitud ha sido enviada a tu superior jerárquico para su autorización.'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Banner del último Relevamiento / Devolución */}
            <EscalationBanner ticket={ticket} onReturn={() => setEscalationMode('return')} />

            {/* Agente Asignado */}
            <div className="surface-card">
              <div className="card-section-header flex-between">
                <div className="header-title-group">
                  <IconUser size={17} className="text-blue" />
                  <h3 className="section-heading">Técnico Asignado</h3>
                </div>
                <div className="assigned-header-actions">
                {userIsAdmin ? (
                  <button
                    type="button"
                    className={`btn-reassign-badge ${isTicketClosedOrResolved ? 'is-disabled' : ''}`}
                    onClick={openReassignModal}
                    disabled={isTicketClosedOrResolved}
                    title={
                      isTicketClosedOrResolved
                        ? 'No se puede reasignar un ticket en estado Resuelto o Cerrado'
                        : 'Reasignar directamente a otro técnico especializado'
                    }
                  >
                    <IconArrowsExchange size={14} />
                    <span>Reasignar Directamente</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn-reassign-badge ${
                      ticket.pending_reassignment || isTicketClosedOrResolved ? 'is-disabled' : ''
                    }`}
                    onClick={openReassignModal}
                    disabled={Boolean(ticket.pending_reassignment) || isTicketClosedOrResolved}
                    title={
                      isTicketClosedOrResolved
                        ? 'No se puede solicitar reasignación en un ticket Resuelto o Cerrado'
                        : ticket.pending_reassignment
                        ? 'Ya existe una solicitud de reasignación pendiente para este ticket'
                        : 'Solicitar reasignación a tu superior jerárquico'
                    }
                  >
                    <IconArrowsExchange size={14} />
                    <span>{ticket.pending_reassignment ? 'Solicitud Pendiente' : 'Solicitar Reasignación'}</span>
                  </button>
                )}
                <EscalationButton ticket={ticket} onClick={() => setEscalationMode('escalate')} />
                </div>
              </div>

              {ticket.tecnico_asignado || ticket.assigned_to ? (
                <>
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
                      <CargoActualLine ticket={ticket} />
                    </div>
                  </div>

                  {/* Estadísticas de Idoneidad del Técnico Asignado (4 Criterios de Asignación) */}
                  {(ticket.tecnico_asignado?.asignacion_metricas || ticket.assigned_to?.asignacion_metricas) && (() => {
                    const metricas = ticket.tecnico_asignado?.asignacion_metricas || ticket.assigned_to?.asignacion_metricas
                    const raw = metricas.raw_metrics || {}
                    const breakdown = metricas.breakdown || {}
                    const score = metricas.score ?? 50

                    return (
                      <div className="assignment-stats-box">
                        <div className="stats-box-header">
                          <div className="stats-title-wrap">
                            <IconAward size={15} className="text-primary" />
                            <span className="stats-box-title">Idoneidad del Técnico</span>
                          </div>
                          <span className="affinity-score-pill" title={metricas.summary || ''}>
                            {score}% Afinidad
                          </span>
                        </div>

                        <div className="affinity-bar-track">
                          <div
                            className="affinity-bar-fill"
                            style={{
                              width: `${Math.min(100, Math.max(5, score))}%`,
                              backgroundColor:
                                score >= 70
                                  ? '#10b981'
                                  : score >= 50
                                  ? '#0284c7'
                                  : '#f59e0b',
                            }}
                          />
                        </div>

                        <div className="assignment-metrics-grid">
                          {/* Criterio 1: Carga actual */}
                          <div className="metric-chip" title="Criterio 1: Tickets activos asignados actualmente">
                            <div className="metric-chip-icon bg-blue-subtle text-blue">
                              <IconChartBar size={13} />
                            </div>
                            <div className="metric-chip-data">
                              <span className="metric-chip-label">Carga Activa</span>
                              <span className="metric-chip-value">
                                {raw.active_workload ?? 0} {raw.active_workload === 1 ? 'ticket' : 'tickets'}
                              </span>
                              <span className="metric-chip-sub">
                                Score: {breakdown.workload ?? 0}%
                              </span>
                            </div>
                          </div>

                          {/* Criterio 2: Especialidad */}
                          <div className="metric-chip" title="Criterio 2: Casos resueltos en esta categoría">
                            <div className="metric-chip-icon bg-emerald-subtle text-emerald">
                              <IconTarget size={13} />
                            </div>
                            <div className="metric-chip-data">
                              <span className="metric-chip-label">Especialidad</span>
                              <span className="metric-chip-value">
                                {raw.category_tickets ?? 0} resueltos
                              </span>
                              <span className="metric-chip-sub">
                                En categoría
                              </span>
                            </div>
                          </div>

                          {/* Criterio 3: SLA */}
                          <div className="metric-chip" title="Criterio 3: % de tickets resueltos dentro del SLA">
                            <div className="metric-chip-icon bg-purple-subtle text-purple">
                              <IconClock size={13} />
                            </div>
                            <div className="metric-chip-data">
                              <span className="metric-chip-label">Cumplimiento SLA</span>
                              <span className="metric-chip-value">
                                {raw.sla_rate ?? 100}%
                              </span>
                              <span className="metric-chip-sub">
                                {raw.sla_compliant ?? 0} a tiempo
                              </span>
                            </div>
                          </div>

                          {/* Criterio 4: Velocidad MTTR */}
                          <div className="metric-chip" title="Criterio 4: Tiempo medio de resolución en horas">
                            <div className="metric-chip-icon bg-amber-subtle text-amber">
                              <IconBolt size={13} />
                            </div>
                            <div className="metric-chip-data">
                              <span className="metric-chip-label">Velocidad MTTR</span>
                              <span className="metric-chip-value">
                                {raw.mttr_hours > 0 ? `${raw.mttr_hours}h` : 'N/A'}
                              </span>
                              <span className="metric-chip-sub">
                                Prom. resolución
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div className="unassigned-profile">
                  <span>Ticket pendiente de asignación técnica</span>
                </div>
              )}
            </div>

            {/* Componente Dinámico de Horas sin Responder (Solo visible en Estado de Espera) */}
            <TicketWaitingHours ticket={ticket} />

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
                {/* Solo se refleja en estado de Espera */}
                {isWaitingState(ticket) && (
                  <div className="sla-row">
                    <span className="sla-label">Tiempo en Espera:</span>
                    <span className="sla-val text-amber font-semibold">
                      {calculateWaitingHoursText()}
                    </span>
                  </div>
                )}
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
                <h2 className="modal-title">
                  {userIsAdmin
                    ? 'Reasignar Técnico Especializado (Directo)'
                    : 'Solicitar Reasignación de Técnico'}
                </h2>
                <span className="modal-subtitle">
                  Ticket {ticket.codigo || `#${ticket.id}`} ·{' '}
                  {userIsAdmin
                    ? 'Como Administrador, la reasignación se aplicará de inmediato'
                    : 'Requiere revisión y autorización del Administrador (Director)'}
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
                  <span className="section-subheading">
                    {ticket.cargo_actual?.nivel
                      ? `Técnicos disponibles en el nivel ${ticket.cargo_actual.nivel}:`
                      : 'Técnicos calificados disponibles:'}
                  </span>
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
                        {ticket.cargo_actual?.nivel
                          ? `No hay otro agente activo en el nivel ${ticket.cargo_actual.nivel} que atienda esta categoría y prioridad. `
                          : `Ningún agente activo tiene designada la categoría "${ticket.category?.name || 'N/A'}" y la prioridad "${priorityLabel(ticket.priority)}". `}
                        La reasignación solo mueve el ticket dentro de su nivel; para subirlo o bajarlo usa "Relevar Ticket".
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="agents-selectable-list">
                    {eligibleAgents.map((agent, index) => {
                      const isTopRecommended = index === 0 && !agent.is_current_assignee && (agent.assignment_score ?? 0) > 0
                      const scoreVal = agent.assignment_score ?? 50
                      const raw = agent.raw_metrics || {}

                      return (
                        <div
                          key={agent.id}
                          className={`agent-select-card ${
                            selectedAgentId === agent.id ? 'selected' : ''
                          } ${agent.is_current_assignee ? 'is-current' : ''}`}
                          onClick={() => setSelectedAgentId(agent.id)}
                        >
                          <div className="agent-card-main-row">
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
                                {isTopRecommended && (
                                  <span className="recommended-pill">
                                    <IconAward size={11} /> #1 Recomendado
                                  </span>
                                )}
                              </div>

                              <span className="agent-card-email">{agent.email}</span>
                            </div>

                            {/* Badge de Puntuación Global de Idoneidad */}
                            <div className="agent-score-container" title="Puntuación ponderada según los 4 criterios de asignación">
                              <div className="score-badge-wrap">
                                <span className="score-number">{scoreVal}</span>
                                <span className="score-max">/100</span>
                              </div>
                              <div className="agent-mini-score-bar">
                                <div
                                  className="agent-mini-score-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(5, scoreVal))}%`,
                                    backgroundColor:
                                      scoreVal >= 70
                                        ? '#10b981'
                                        : scoreVal >= 50
                                        ? '#0284c7'
                                        : '#f59e0b',
                                  }}
                                />
                              </div>
                              <span className="score-caption">Idoneidad</span>
                            </div>
                          </div>

                          {/* Estadísticas de los 4 Criterios de Asignación */}
                          <div className="agent-algo-stats-row">
                            {/* Criterio 1: Carga */}
                            <div className="algo-stat-item" title="Criterio 1: Carga actual de trabajo">
                              <span className="algo-stat-icon text-blue">
                                <IconChartBar size={12} />
                              </span>
                              <span className="algo-stat-label">Carga:</span>
                              <span className="algo-stat-val">
                                {raw.active_workload ?? agent.assigned_tickets_count ?? 0} act.
                              </span>
                            </div>

                            {/* Criterio 2: Especialidad */}
                            <div className="algo-stat-item" title="Criterio 2: Casos resueltos en esta categoría">
                              <span className="algo-stat-icon text-emerald">
                                <IconTarget size={12} />
                              </span>
                              <span className="algo-stat-label">Especialidad:</span>
                              <span className="algo-stat-val">
                                {raw.category_tickets ?? 0} resueltos
                              </span>
                            </div>

                            {/* Criterio 3: SLA */}
                            <div className="algo-stat-item" title="Criterio 3: % de tickets resueltos dentro del SLA">
                              <span className="algo-stat-icon text-purple">
                                <IconClock size={12} />
                              </span>
                              <span className="algo-stat-label">SLA:</span>
                              <span className="algo-stat-val">
                                {raw.sla_rate ?? 100}%
                              </span>
                            </div>

                            {/* Criterio 4: MTTR */}
                            <div className="algo-stat-item" title="Criterio 4: Tiempo medio de resolución en horas">
                              <span className="algo-stat-icon text-amber">
                                <IconBolt size={12} />
                              </span>
                              <span className="algo-stat-label">MTTR:</span>
                              <span className="algo-stat-val">
                                {raw.mttr_hours > 0 ? `${raw.mttr_hours}h` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Comentario de Reasignación */}
              <div className="form-group mt-3">
                <label className="form-label" htmlFor="reassign-comment">
                  {userIsAdmin
                    ? 'Motivo o comentario de la reasignación (opcional):'
                    : 'Justificación o motivo técnico de la reasignación (Requerido): *'}
                </label>
                <textarea
                  id="reassign-comment"
                  value={reassignComment}
                  rows={2}
                  maxLength={1000}
                  className={`textarea-field ${reassignFieldErrors.comments ? 'input-invalid' : ''}`}
                  aria-invalid={Boolean(reassignFieldErrors.comments)}
                  placeholder={
                    userIsAdmin
                      ? 'Ej. Reasignación directa por especialidad técnica en campus...'
                      : 'Ej. Se solicita derivar por alta carga o especialidad requerida en el campus virtual...'
                  }
                  onChange={(e) => {
                    setReassignComment(e.target.value)
                    if (reassignFieldErrors.comments) {
                      setReassignFieldErrors((prev) => ({ ...prev, comments: '' }))
                    }
                    if (reassignError) setReassignError('')
                  }}
                />
                {reassignFieldErrors.comments && (
                  <span className="field-error-text">{reassignFieldErrors.comments}</span>
                )}
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
                disabled={
                  !selectedAgentId ||
                  reassigning ||
                  eligibleAgents.length === 0
                }
                onClick={handleConfirmReassign}
              >
                <IconArrowsExchange size={16} />
                <span>
                  {reassigning
                    ? (userIsAdmin ? 'Reasignando...' : 'Enviando solicitud...')
                    : (userIsAdmin ? 'Confirmar Reasignación Directa' : 'Enviar Solicitud al Superior')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales de Relevamiento y Devolución */}
      <EscalationModals ticket={ticket} mode={escalationMode} onClose={() => setEscalationMode(null)} />

      {/* Modal para Rechazar Solicitud de Reasignación (Admin) */}
      {isRejectModalOpen && (
        <div
          className="reassign-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRejectModalOpen(false)
          }}
        >
          <div className="reassign-modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title" style={{ color: 'var(--color-danger-600)' }}>Rechazar Solicitud de Reasignación</h2>
                <span className="modal-subtitle">
                  Ticket {ticket.codigo || `#${ticket.id}`}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsRejectModalOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="reassign-modal-body">
              <p style={{ fontSize: '0.84375rem', color: 'var(--text-body)', marginBottom: '14px', lineHeight: '1.5' }}>
                Indica el motivo por el cual estás rechazando la reasignación solicitada por{' '}
                <b>{ticket.pending_reassignment?.solicitante?.name || 'el técnico'}</b> hacia{' '}
                <b>{ticket.pending_reassignment?.tecnico_propuesto?.name || 'otro técnico'}</b>.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="reject-reason">
                  Motivo o justificación del rechazo: *
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  rows={3}
                  maxLength={1000}
                  className={`textarea-field ${rejectFieldErrors.reason ? 'input-invalid' : ''}`}
                  aria-invalid={Boolean(rejectFieldErrors.reason)}
                  placeholder="Ej. El técnico asignado cuenta con la disponibilidad y especialidad requerida..."
                  onChange={(e) => {
                    setRejectReason(e.target.value)
                    if (rejectFieldErrors.reason) {
                      setRejectFieldErrors((prev) => ({ ...prev, reason: '' }))
                    }
                    if (rejectError) setRejectError('')
                  }}
                />
                {rejectFieldErrors.reason && (
                  <span className="field-error-text">{rejectFieldErrors.reason}</span>
                )}
              </div>

              {rejectError && (
                <div className="reassign-error-alert">
                  <IconAlertCircle size={16} />
                  <span>{rejectError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={rejecting}
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger-action"
                disabled={rejecting}
                onClick={handleConfirmReject}
              >
                <IconX size={16} />
                <span>{rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

