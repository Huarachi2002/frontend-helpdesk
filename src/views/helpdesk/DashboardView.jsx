import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import { Tag } from 'primereact/tag'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
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
  IconInfoCircle,
} from '@tabler/icons-react'
import {
  getVolumeReport,
  getImpactReport,
  getTimesReport,
  getDashboardReport,
} from '../../api/reports.js'
import { chartColors } from '../../styles/theme.js'
import './DashboardView.css'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
)

// Mapeo estados internos → etiqueta española
const ESTADO_LABELS = {
  EN_ESPERA: 'En Espera',
  CLIENTE_ESPERANDO_RESPUESTA: 'En Progreso',
  ESPERANDO_POR_CLIENTE: 'Esperando Cliente',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
}

const ESTADO_COLORS = {
  EN_ESPERA: '#f59e0b',
  CLIENTE_ESPERANDO_RESPUESTA: '#3b82f6',
  ESPERANDO_POR_CLIENTE: '#8b5cf6',
  RESUELTO: '#22c55e',
  CERRADO: '#94a3b8',
}

export default function DashboardView() {
  const [loading, setLoading] = useState(true)
  const [volume, setVolume] = useState({})
  const [impact, setImpact] = useState({})
  const [times, setTimes] = useState({})
  const [dashData, setDashData] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [v, i, t, d] = await Promise.all([
        getVolumeReport(),
        getImpactReport(),
        getTimesReport(),
        getDashboardReport(),
      ])
      setVolume(v.data || {})
      setImpact(i.data || {})
      setTimes(t.data || {})
      setDashData(d.data || null)
    } catch (err) {
      console.error('Error al cargar datos del dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- Datos para gráfico de línea FRT/MTTR por mes ---
  const parseHours = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? 0 : Number(num.toFixed(2))
  }

  const trendLabels = (dashData?.tiempos_por_mes ?? []).map(m => m.mes)
  const frtData = (dashData?.tiempos_por_mes ?? []).map(m => parseHours(m.frt_promedio_horas))
  const mttrData = (dashData?.tiempos_por_mes ?? []).map(m => parseHours(m.mttr_promedio_horas))

  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'FRT (hrs)',
        data: frtData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'MTTR (hrs)',
        data: mttrData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
        borderWidth: 2,
      },
    ],
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}h`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { callback: v => `${v}h` },
      },
      x: { grid: { display: false } },
    },
  }

  // --- Datos para gráfico dona por estado ---
  const estadosData = dashData?.por_estado ?? []
  const donutData = {
    labels: estadosData.map(e => ESTADO_LABELS[e.estado] || e.estado),
    datasets: [{
      data: estadosData.map(e => e.total),
      backgroundColor: estadosData.map(e => ESTADO_COLORS[e.estado] || '#94a3b8'),
      borderWidth: 0,
    }],
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } },
    },
    cutout: '65%',
  }

  const totalTicketsByState = estadosData.reduce((acc, e) => acc + Number(e.total), 0)

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
            icon={<IconRefresh size={16} />}
          />
        </div>
      </div>

      {/* KPIs principales */}
      {loading ? (
        <div className="kpi-grid">
          {[1,2,3,4].map(i => (
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
        <div className="kpi-grid">
          <div className="kpi-card card-tickets">
            <div className="kpi-icon-wrap bg-blue"><IconTicket size={26} strokeWidth={2} /></div>
            <div className="kpi-content">
              <div className="kpi-value">{volume.total_tickets ?? 0}</div>
              <div className="kpi-label">Total de Tickets Registrados</div>
              <div className="kpi-subtext">Plataforma educativa</div>
            </div>
          </div>

          <div className="kpi-card card-frt">
            <div className="kpi-icon-wrap bg-amber"><IconClockHour4 size={26} strokeWidth={2} /></div>
            <div className="kpi-content">
              <div className="kpi-value">
                {times.frt_hours_average != null ? `${times.frt_hours_average}h` : '—'}
              </div>
              <div className="kpi-label">Tiempo 1ª Respuesta (FRT)</div>
              <div className="kpi-subtext">Promedio general</div>
            </div>
          </div>

          <div className="kpi-card card-mttr">
            <div className="kpi-icon-wrap bg-emerald"><IconHourglassHigh size={26} strokeWidth={2} /></div>
            <div className="kpi-content">
              <div className="kpi-value">
                {times.mttr_hours?.average != null ? `${times.mttr_hours.average}h` : '—'}
              </div>
              <div className="kpi-label">Tiempo Resolución (MTTR)</div>
              <div className="kpi-subtext">Horas promedio</div>
            </div>
          </div>

          <div className="kpi-card card-bot">
            <div className="kpi-icon-wrap bg-purple"><IconRobot size={26} strokeWidth={2} /></div>
            <div className="kpi-content">
              <div className="kpi-value">
                {impact.bot_autonomous_resolution_rate_percent != null
                  ? `${impact.bot_autonomous_resolution_rate_percent}%` : '—'}
              </div>
              <div className="kpi-label">Resolución Autónoma Bot</div>
              <div className="kpi-subtext">Efectividad directa</div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos analíticos */}
      {dashData && (
        <div className="analytics-section">
          {/* Gráfico de tendencia FRT/MTTR */}
          <div className="chart-card">
            <div className="chart-header">
              <IconChartBar size={18} className="text-blue" />
              <h3 className="chart-title">Tendencia FRT vs MTTR por Mes (últimos 6 meses)</h3>
            </div>
            <div className="chart-body">
              {trendLabels.length > 0 ? (
                <Line data={trendChartData} options={trendOptions} height={260} />
              ) : (
                <div className="chart-empty">No hay datos de períodos disponibles</div>
              )}
            </div>
          </div>

          {/* Distribución por estado */}
          <div className="chart-card">
            <div className="chart-header">
              <IconActivity size={18} className="text-purple" />
              <h3 className="chart-title">Distribución de Tickets por Estado</h3>
            </div>
            <div className="chart-body donut-wrap">
              {estadosData.length > 0 ? (
                <>
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="donut-center">
                    <span className="donut-total">{totalTicketsByState}</span>
                    <span className="donut-label">Total</span>
                  </div>
                </>
              ) : (
                <div className="chart-empty">No hay datos de estados disponibles</div>
              )}
            </div>
            {/* Lista de estados */}
            {estadosData.length > 0 && (
              <div className="estado-list">
                {estadosData.map(e => (
                  <div key={e.estado} className="estado-item">
                    <span className="estado-dot" style={{ background: ESTADO_COLORS[e.estado] || '#94a3b8' }} />
                    <span className="estado-name">{ESTADO_LABELS[e.estado] || e.estado}</span>
                    <span className="estado-count">{e.total}</span>
                    <span className="estado-pct">
                      {totalTicketsByState > 0 ? Math.round(e.total / totalTicketsByState * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sección de accesos directos y estado operativo */}
      <div className="dashboard-sections">
        {/* Acciones Rápidas */}
        <div className="section-card actions-box">
          <div className="section-header">
            <div className="section-icon"><IconSparkles size={20} /></div>
            <h2 className="section-title">Accesos Rápidos</h2>
          </div>
          <p className="section-desc">Accede directamente a los módulos operacionales del sistema:</p>
          <div className="actions-grid">
            <Link to="/tickets" className="action-card">
              <div className="action-card-icon icon-blue"><IconTicket size={24} /></div>
              <div className="action-card-info">
                <span className="action-title">Bandeja de Tickets</span>
                <span className="action-desc">Gestiona incidencias de alumnos y profesores</span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>
            <Link to="/bot-history" className="action-card">
              <div className="action-card-icon icon-purple"><IconRobot size={24} /></div>
              <div className="action-card-info">
                <span className="action-title">Historial del Bot IA</span>
                <span className="action-desc">Monitorea consultas, respuestas e intenciones</span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>
            <Link to="/reports" className="action-card">
              <div className="action-card-icon icon-emerald"><IconChartBar size={24} /></div>
              <div className="action-card-info">
                <span className="action-title">Reportes & Estadísticas</span>
                <span className="action-desc">Gráficas de volumen, categorías y exportaciones</span>
              </div>
              <IconArrowRight size={18} className="action-arrow" />
            </Link>
          </div>
        </div>

        {/* Salud del Sistema */}
        <div className="section-card status-box">
          <div className="section-header">
            <div className="section-icon"><IconActivity size={20} /></div>
            <h2 className="section-title">Salud del Entorno Helpdesk</h2>
          </div>
          <div className="health-list">
            <div className="health-item">
              <div className="health-status-icon success"><IconCircleCheck size={18} /></div>
              <div className="health-info">
                <span className="health-name">Servicio Moodle Webhooks</span>
                <span className="health-sub">Escuchando eventos de tickets y cursos</span>
              </div>
              <Tag value="Operativo" severity="success" rounded />
            </div>
            <div className="health-item">
              <div className="health-status-icon success"><IconCircleCheck size={18} /></div>
              <div className="health-info">
                <span className="health-name">Motor de IA NLP / Bot</span>
                <span className="health-sub">Modelo de clasificación de intenciones</span>
              </div>
              <Tag value="Activo" severity="success" rounded />
            </div>
            <div className="health-item">
              <div className="health-status-icon success"><IconCircleCheck size={18} /></div>
              <div className="health-info">
                <span className="health-name">Base de Datos PostgreSQL</span>
                <span className="health-sub">Auditoría y tiempos de resolución OK</span>
              </div>
              <Tag value="Conectado" severity="info" rounded />
            </div>
          </div>
          <div className="bot-summary-card">
            <div className="bot-summary-stat">
              <span className="bot-stat-title">Tasa de Escalado a Humano</span>
              <span className="bot-stat-val">
                {impact.escalation_to_human_rate_percent != null
                  ? `${impact.escalation_to_human_rate_percent}%` : '—'}
              </span>
            </div>
            <div className="bot-summary-bar">
              <div
                className="bot-progress"
                style={{ width: `${impact.escalation_to_human_rate_percent || 0}%` }}
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
