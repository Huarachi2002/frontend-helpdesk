import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import {
  IconTicket,
  IconClockHour4,
  IconHourglassHigh,
  IconRobot,
  IconRefresh,
  IconArrowRight,
  IconChartBar,
  IconSparkles,
  IconActivity,
  IconCircleCheck,
} from '@tabler/icons-react'
import { getVolumeReport, getImpactReport, getTimesReport } from '../../api/reports.js'
import './DashboardView.css'

export default function DashboardView() {
  const [loading, setLoading] = useState(true)
  const [volume, setVolume] = useState({})
  const [impact, setImpact] = useState({})
  const [times, setTimes] = useState({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const [v, i, t] = await Promise.all([
        getVolumeReport(),
        getImpactReport(),
        getTimesReport(),
      ])
      setVolume(v.data || {})
      setImpact(i.data || {})
      setTimes(t.data || {})
    } catch (err) {
      console.error('Error al cargar datos del dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="dashboard-page">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Control Helpdesk</h1>
          <p className="page-subtitle">
            Resumen operativo de incidencias del campus y rendimiento del Bot de IA
          </p>
        </div>

        <div className="header-actions">
          <Button
            label="Actualizar datos"
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={fetchData}
            icon={<IconRefresh size={16} className="p-button-icon-left" />}
          />
        </div>
      </div>

      {/* Skeletons durante carga */}
      {loading ? (
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card skeleton-card">
              <Skeleton shape="circle" size="48px" />
              <div className="skeleton-text">
                <Skeleton width="60%" height="28px" className="mb-2" />
                <Skeleton width="90%" height="16px" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid de KPIs principales */
        <div className="kpi-grid">
          {/* Total Tickets */}
          <div className="kpi-card card-tickets">
            <div className="kpi-icon-wrap bg-blue">
              <IconTicket size={26} strokeWidth={2} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{volume.total_tickets ?? 0}</div>
              <div className="kpi-label">Total de Tickets Registrados</div>
              <div className="kpi-subtext">Plataforma educativa</div>
            </div>
          </div>

          {/* FRT Promedio */}
          <div className="kpi-card card-frt">
            <div className="kpi-icon-wrap bg-amber">
              <IconClockHour4 size={26} strokeWidth={2} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">
                {times.frt_hours_average != null ? `${times.frt_hours_average}h` : '—'}
              </div>
              <div className="kpi-label">Tiempo 1ª Respuesta (FRT)</div>
              <div className="kpi-subtext">Promedio general</div>
            </div>
          </div>

          {/* MTTR Promedio */}
          <div className="kpi-card card-mttr">
            <div className="kpi-icon-wrap bg-emerald">
              <IconHourglassHigh size={26} strokeWidth={2} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">
                {times.mttr_hours?.average != null ? `${times.mttr_hours.average}h` : '—'}
              </div>
              <div className="kpi-label">Tiempo Resolución (MTTR)</div>
              <div className="kpi-subtext">Horas promedio</div>
            </div>
          </div>

          {/* Resolución Bot */}
          <div className="kpi-card card-bot">
            <div className="kpi-icon-wrap bg-purple">
              <IconRobot size={26} strokeWidth={2} />
            </div>
            <div className="kpi-content">
              <div className="kpi-value">
                {impact.bot_autonomous_resolution_rate_percent != null
                  ? `${impact.bot_autonomous_resolution_rate_percent}%`
                  : '—'}
              </div>
              <div className="kpi-label">Resolución Autónoma Bot</div>
              <div className="kpi-subtext">Efectividad directa</div>
            </div>
          </div>
        </div>
      )}

      {/* Sección de accesos directos y estado operativo */}
      <div className="dashboard-sections">
        {/* Acciones Rápidas */}
        <div className="section-card actions-box">
          <div className="section-header">
            <div className="section-icon">
              <IconSparkles size={20} />
            </div>
            <h2 className="section-title">Accesos Rápidos</h2>
          </div>

          <p className="section-desc">
            Accede directamente a los módulos operacionales del sistema:
          </p>

          <div className="actions-grid">
            <Link to="/tickets" className="action-card">
              <div className="action-card-icon icon-blue">
                <IconTicket size={24} />
              </div>
              <div className="action-card-info">
                <span className="action-title">Bandeja de Tickets</span>
                <span className="action-desc">
                  Gestiona incidencias de alumnos y profesores
                </span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>

            <Link to="/bot-history" className="action-card">
              <div className="action-card-icon icon-purple">
                <IconRobot size={24} />
              </div>
              <div className="action-card-info">
                <span className="action-title">Historial del Bot IA</span>
                <span className="action-desc">
                  Monitorea consultas, respuestas e intenciones
                </span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>

            <Link to="/reports" className="action-card">
              <div className="action-card-icon icon-emerald">
                <IconChartBar size={24} />
              </div>
              <div className="action-card-info">
                <span className="action-title">Reportes & Estadísticas</span>
                <span className="action-desc">
                  Gráficas de volumen, categorías y exportaciones
                </span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>
          </div>
        </div>

        {/* Resumen Operativo & Salud del Sistema */}
        <div className="section-card status-box">
          <div className="section-header">
            <div className="section-icon">
              <IconActivity size={20} />
            </div>
            <h2 className="section-title">Salud del Entorno Helpdesk</h2>
          </div>

          <div className="health-list">
            <div className="health-item">
              <div className="health-status-icon success">
                <IconCircleCheck size={18} />
              </div>
              <div className="health-info">
                <span className="health-name">Servicio Moodle Webhooks</span>
                <span className="health-sub">
                  Escuchando eventos de tickets y cursos
                </span>
              </div>
              <Tag value="Operativo" severity="success" rounded />
            </div>

            <div className="health-item">
              <div className="health-status-icon success">
                <IconCircleCheck size={18} />
              </div>
              <div className="health-info">
                <span className="health-name">Motor de IA NLP / Bot</span>
                <span className="health-sub">
                  Modelo de clasificación de intenciones
                </span>
              </div>
              <Tag value="Activo" severity="success" rounded />
            </div>

            <div className="health-item">
              <div className="health-status-icon success">
                <IconCircleCheck size={18} />
              </div>
              <div className="health-info">
                <span className="health-name">Base de Datos PostgreSQL</span>
                <span className="health-sub">
                  Auditoría y tiempos de resolución OK
                </span>
              </div>
              <Tag value="Conectado" severity="info" rounded />
            </div>
          </div>

          <div className="bot-summary-card">
            <div className="bot-summary-stat">
              <span className="bot-stat-title">Tasa de Escalado a Humano</span>
              <span className="bot-stat-val">
                {impact.escalation_to_human_rate_percent != null
                  ? `${impact.escalation_to_human_rate_percent}%`
                  : '—'}
              </span>
            </div>
            <div className="bot-summary-bar">
              <div
                className="bot-progress"
                style={{
                  width: `${impact.escalation_to_human_rate_percent || 0}%`,
                }}
              />
            </div>
            <span className="bot-hint">
              El restante {impact.bot_autonomous_resolution_rate_percent || 0}% es
              resuelto sin requerir intervención humana.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

