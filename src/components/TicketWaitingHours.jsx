import React, { useState, useEffect, useMemo } from 'react'
import {
  IconHourglassHigh,
  IconClockPause,
  IconAlertTriangle,
  IconCheck,
  IconFlame,
} from '@tabler/icons-react'
import './TicketWaitingHours.css'

/**
 * Componente que muestra las horas sin responder de un ticket.
 * REGLA DE NEGOCIO:
 * Solo debe reflejar y calcular la información cuando el ticket se encuentra
 * en estado de Espera ('EN_ESPERA', 'open', 'ESPERANDO_POR_CLIENTE', 'waiting').
 * En cualquier otro estado (Resuelto, Cerrado, En proceso), no debe mostrarse.
 * 
 * @param {Object} props
 * @param {Object} props.ticket Objeto del ticket con su estado, prioridad y fechas.
 */
export default function TicketWaitingHours({ ticket }) {
  const [now, setNow] = useState(() => new Date())

  // Actualizar el temporizador en tiempo real cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Determinar si el estado actual corresponde a "En Espera"
  const isWaiting = useMemo(() => {
    if (!ticket) return false
    const state = String(ticket.estado || ticket.status || '').trim().toLowerCase()
    return (
      state === 'en_espera' ||
      state === 'open' ||
      state === 'cliente_esperando_respuesta' ||
      state === 'waiting'
    )
  }, [ticket?.estado, ticket?.status])

  // Cálculo del tiempo transcurrido sin respuesta
  const calculation = useMemo(() => {
    if (!ticket) return null

    const createdRaw = ticket.fecha_creacion || ticket.times?.created_at || ticket.created_at
    if (!createdRaw) return null

    const createdAt = new Date(createdRaw)
    if (isNaN(createdAt.getTime())) return null

    const diffMs = Math.max(0, now.getTime() - createdAt.getTime())
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const decimalHours = +(hours + minutes / 60).toFixed(1)

    // Obtener SLA de resolución o respuesta según prioridad si está disponible
    const slaHours = ticket.prioridad?.sla_horas_resolucion || null

    let slaStatus = 'normal' // 'normal' | 'warning' | 'danger'
    let progressPercent = 0

    if (slaHours && slaHours > 0) {
      progressPercent = Math.min(100, Math.round((hours / slaHours) * 100))
      if (hours >= slaHours) {
        slaStatus = 'danger'
      } else if (hours >= slaHours * 0.7) {
        slaStatus = 'warning'
      }
    } else {
      // Umbrales por defecto en ausencia de SLA explícito
      if (hours >= 24) {
        slaStatus = 'danger'
      } else if (hours >= 12) {
        slaStatus = 'warning'
      }
    }

    return {
      createdAt,
      hours,
      minutes,
      decimalHours,
      slaHours,
      slaStatus,
      progressPercent,
    }
  }, [ticket, now])

  // REGLA CLAVE: En otros estados no se muestra la información
  if (!isWaiting || !calculation) {
    return null
  }

  const { hours, minutes, slaHours, slaStatus, progressPercent } = calculation

  return (
    <div className={`ticket-waiting-hours-card sla-status-${slaStatus}`}>
      <div className="waiting-card-header">
        <div className="waiting-title-wrap">
          <div className="waiting-icon-box">
            {slaStatus === 'danger' ? (
              <IconFlame size={18} className="icon-pulse text-danger" />
            ) : slaStatus === 'warning' ? (
              <IconAlertTriangle size={18} className="text-warning" />
            ) : (
              <IconHourglassHigh size={18} className="text-primary" />
            )}
          </div>
          <div>
            <h4 className="waiting-card-title">Horas sin Responder</h4>
            <span className="waiting-card-subtitle">Ticket en Estado de Espera</span>
          </div>
        </div>

        <span className={`waiting-status-pill pill-${slaStatus}`}>
          <span className="pill-pulse-dot" />
          {slaStatus === 'danger'
            ? 'Atención Demorada'
            : slaStatus === 'warning'
            ? 'Próximo a Límite'
            : 'En Plazo'}
        </span>
      </div>

      <div className="waiting-timer-display">
        <div className="timer-number-group">
          <span className="timer-number">{hours}</span>
          <span className="timer-unit">hs</span>
          <span className="timer-number minutes-text">{String(minutes).padStart(2, '0')}</span>
          <span className="timer-unit">min</span>
        </div>
        <span className="timer-sub-caption">
          Tiempo acumulado sin primera respuesta técnica
        </span>
      </div>

      {slaHours && (
        <div className="waiting-sla-progress-box">
          <div className="sla-progress-labels">
            <span>Objetivo SLA: {slaHours} hs</span>
            <span>{progressPercent}% del plazo</span>
          </div>
          <div className="sla-progress-track">
            <div
              className={`sla-progress-bar bar-${slaStatus}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
