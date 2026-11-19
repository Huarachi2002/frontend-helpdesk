import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconBell,
  IconCheck,
  IconTicket,
  IconArrowsExchange,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconChevronRight,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useNotificationsStore } from '../stores/notificationsStore.js'
import './NotificationBell.css'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  } = useNotificationsStore()

  // Iniciar sondeo periódico (polling cada 30 segundos)
  useEffect(() => {
    startPolling(30000)
    return () => stopPolling()
  }, [])

  // Cargar lista completa cuando se abre el desplegable
  useEffect(() => {
    if (open) {
      fetchNotifications({ limit: 15 })
    }
  }, [open])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleNotificationClick = async (notif) => {
    if (!notif.leida) {
      await markAsRead(notif.id)
    }
    setOpen(false)

    if (notif.ticket_id) {
      navigate(`/tickets/${notif.ticket_id}`)
    } else {
      navigate('/tickets')
    }
  }

  const formatRelativeTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / (1000 * 60))
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHrs < 24) return `Hace ${diffHrs} h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
  }

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'TICKET_CREADO':
        return <IconTicket size={16} className="notif-icon-ticket" />
      case 'CAMBIO_ESTADO':
        return <IconClock size={16} className="notif-icon-status" />
      case 'SOLICITUD_REASIGNACION':
        return <IconArrowsExchange size={16} className="notif-icon-reassign" />
      case 'REASIGNACION_APROBADA':
        return <IconCircleCheck size={16} className="notif-icon-approved" />
      case 'REASIGNACION_RECHAZADA':
        return <IconCircleX size={16} className="notif-icon-rejected" />
      case 'RECORDATORIO_PENDIENTE':
        return <IconAlertTriangle size={16} className="notif-icon-reminder" />
      case 'TICKET_SIN_RESPUESTA':
        return <IconInfoCircle size={16} className="notif-icon-wait" />
      default:
        return <IconTicket size={16} className="notif-icon-ticket" />
    }
  }

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      <button
        className={`notif-bell-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Bandeja de Notificaciones"
        aria-label="Notificaciones"
      >
        <IconBell size={21} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <div className="notif-header-title">
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className="notif-unread-pill">{unreadCount} nuevas</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={markAllAsRead}
                title="Marcar todas como leídas"
              >
                <IconCheck size={14} />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          <div className="notif-dropdown-body">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-spinner" />
                <span>Cargando notificaciones...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <IconBell size={32} className="notif-empty-icon" />
                <p className="notif-empty-title">Sin notificaciones</p>
                <p className="notif-empty-desc">
                  No tienes avisos pendientes por revisar.
                </p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${!n.leida ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="notif-item-icon-box">
                      {getNotificationIcon(n.tipo)}
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-top">
                        <span className="notif-item-title">{n.titulo}</span>
                        <span className="notif-item-time">
                          {formatRelativeTime(n.fecha_creacion)}
                        </span>
                      </div>
                      <p className="notif-item-message">{n.mensaje}</p>
                      {n.ticket && (
                        <div className="notif-item-meta">
                          <span className="notif-ticket-code">{n.ticket.codigo}</span>
                          <span className="notif-item-arrow">
                            Ver ticket <IconChevronRight size={12} />
                          </span>
                        </div>
                      )}
                    </div>
                    {!n.leida && <span className="notif-unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notif-dropdown-footer">
            <button
              className="notif-view-all-btn"
              onClick={() => {
                setOpen(false)
                navigate('/tickets')
              }}
            >
              Ir a Mesa de Tickets
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
