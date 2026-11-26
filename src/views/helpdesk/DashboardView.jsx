import React, { useState, useEffect, useMemo } from 'react'
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
import { Line, Bar, Doughnut } from 'react-chartjs-2'
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
  IconTrendingUp,
  IconTrendingDown,
  IconTargetArrow,
  IconExternalLink,
} from '@tabler/icons-react'
import {
  getVolumeReport,
  getImpactReport,
  getTimesReport,
  getDashboardReport,
} from '../../api/reports.js'
import Sparkline from '../../components/ui/Sparkline.jsx'
import BulletChart from '../../components/ui/BulletChart.jsx'
import DetailDrawer from '../../components/ui/DetailDrawer.jsx'
import '../../components/ui/uxWidgets.css'
import './DashboardView.css'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
)

// Mapeo estados internos → etiqueta española y descripción operativa
const ESTADO_META = {
  EN_ESPERA: {
    label: 'Abierto / En Espera',
    color: '#f59e0b',
    severity: 'warning',
    desc: 'Tickets nuevos pendientes de primera asignación o inicio de atención.',
  },
  CLIENTE_ESPERANDO_RESPUESTA: {
    label: 'En Progreso',
    color: '#0284c7',
    severity: 'info',
    desc: 'Incidencias actualmente bajo diagnóstico o respuesta por el equipo de soporte.',
  },
  ESPERANDO_POR_CLIENTE: {
    label: 'Esperando Cliente',
    color: '#7c3aed',
    severity: 'contrast',
    desc: 'Casos donde soporte respondió y aguarda confirmación o datos del solicitante.',
  },
  RESUELTO: {
    label: 'Resuelto',
    color: '#10b981',
    severity: 'success',
    desc: 'Incidencias solucionadas satisfactoriamente por técnicos o el asistente.',
  },
  CERRADO: {
    label: 'Cerrado',
    color: '#64748b',
    severity: 'secondary',
    desc: 'Tickets finalizados y archivados definitivamente.',
  },
}

const parseNum = (val) => {
  const num = parseFloat(val)
  return Number.isNaN(num) ? 0 : Number(num.toFixed(2))
}

/** Calcula variación porcentual entre los dos últimos puntos de una serie. */
function computeDelta(series) {
  if (!series || series.length < 2) return null
  const prev = Number(series[series.length - 2])
  const curr = Number(series[series.length - 1])
  if (!prev || Number.isNaN(prev) || Number.isNaN(curr)) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export default function DashboardView() {
  const [loading, setLoading] = useState(true)
  const [volume, setVolume] = useState({})
  const [impact, setImpact] = useState({})
  const [times, setTimes] = useState({})
  const [dashData, setDashData] = useState(null)

  // Controles de revelación progresiva (Tabs / Toggles y Drawer)
  const [trendMode, setTrendMode] = useState('times') // 'times' | 'volume'
  const [opsTab, setOpsTab] = useState('actions') // 'actions' | 'health'
  const [selectedEstado, setSelectedEstado] = useState(null)

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

  // Series mensuales reales para sparklines y gráfico principal
  const monthlySeries = useMemo(() => dashData?.tiempos_por_mes ?? [], [dashData])
  const trendLabels = useMemo(() => monthlySeries.map((m) => m.mes), [monthlySeries])
  const frtSeries = useMemo(() => monthlySeries.map((m) => parseNum(m.frt_promedio_horas)), [monthlySeries])
  const mttrSeries = useMemo(() => monthlySeries.map((m) => parseNum(m.mttr_promedio_horas)), [monthlySeries])
  const volSeries = useMemo(() => monthlySeries.map((m) => Number(m.total_tickets || 0)), [monthlySeries])
  const resolvedSeries = useMemo(() => monthlySeries.map((m) => Number(m.tickets_resueltos || 0)), [monthlySeries])

  // Variaciones vs mes anterior para contextualizar cada KPI
  const volDelta = useMemo(() => computeDelta(volSeries), [volSeries])
  const frtDelta = useMemo(() => computeDelta(frtSeries), [frtSeries])
  const mttrDelta = useMemo(() => computeDelta(mttrSeries), [mttrSeries])

  // Métricas globales para Bullet Charts
  const globalTotals = dashData?.tiempos_globales
  const globalResolutionRate = useMemo(() => {
    const total = Number(globalTotals?.n || volume.total_tickets || 0)
    const resolved = Number(globalTotals?.tickets_resueltos || 0)
    return total > 0 ? Math.round((resolved / total) * 100) : 0
  }, [globalTotals, volume.total_tickets])

  const botAutoRate = Number(impact.bot_autonomous_resolution_rate_percent ?? 0)
  const frtAvg = times.frt_hours_average != null ? Number(times.frt_hours_average) : null
  const mttrAvg = times.mttr_hours?.average != null ? Number(times.mttr_hours.average) : null

  // Datos y opciones del gráfico principal (con toggle Tiempos vs Volumen)
  const timesChartData = useMemo(() => ({
    labels: trendLabels,
    datasets: [
      {
        label: 'FRT promedio (h)',
        data: frtSeries,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'MTTR promedio (h)',
        data: mttrSeries,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#0284c7',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  }), [trendLabels, frtSeries, mttrSeries])

  const volumeChartData = useMemo(() => ({
    labels: trendLabels,
    datasets: [
      {
        label: 'Total tickets',
        data: volSeries,
        backgroundColor: '#0284c7',
        borderRadius: 6,
      },
      {
        label: 'Resueltos',
        data: resolvedSeries,
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
    ],
  }), [trendLabels, volSeries, resolvedSeries])

  // Tooltips enriquecidos (Viz-in-Tooltip) con desglose completo del mes
  const trendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const unit = trendMode === 'times' ? 'h' : ' tickets'
            return ` ${ctx.dataset.label}: ${ctx.parsed.y}${unit}`
          },
          afterBody: (items) => {
            const idx = items?.[0]?.dataIndex
            const row = monthlySeries[idx]
            if (!row) return []
            const tot = Number(row.total_tickets || 0)
            const res = Number(row.tickets_resueltos || 0)
            const pct = tot > 0 ? Math.round((res / tot) * 100) : 0
            if (trendMode === 'times') {
              return [
                '',
                `Volumen del mes: ${tot} tickets`,
                `Resueltos: ${res} (${pct}%)`,
              ]
            }
            return [
              '',
              `Tasa de resolución: ${pct}%`,
              `FRT prom.: ${parseNum(row.frt_promedio_horas)}h · MTTR: ${parseNum(row.mttr_promedio_horas)}h`,
            ]
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.05)' },
        ticks: {
          precision: trendMode === 'volume' ? 0 : undefined,
          callback: (v) => (trendMode === 'times' ? `${v}h` : v),
        },
      },
      x: { grid: { display: false } },
    },
  }), [trendMode, monthlySeries])

  // Distribución por estado (Dona + Micro-tabla con barras + Drawer)
  const estadosData = useMemo(() => {
    const raw = dashData?.por_estado ?? []
    return [...raw].sort((a, b) => Number(b.total) - Number(a.total))
  }, [dashData])

  const totalTicketsByState = useMemo(
    () => estadosData.reduce((acc, e) => acc + Number(e.total), 0),
    [estadosData]
  )

  const donutData = useMemo(() => ({
    labels: estadosData.map((e) => ESTADO_META[e.estado]?.label || e.estado),
    datasets: [{
      data: estadosData.map((e) => Number(e.total)),
      backgroundColor: estadosData.map((e) => ESTADO_META[e.estado]?.color || '#94a3b8'),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    }],
  }), [estadosData])

  const donutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    onClick: (_, elements) => {
      if (elements?.length > 0) {
        const clicked = estadosData[elements[0].index]
        if (clicked) setSelectedEstado(clicked)
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const val = Number(ctx.parsed || 0)
            const pct = totalTicketsByState > 0 ? Math.round((val / totalTicketsByState) * 100) : 0
            return ` ${ctx.label}: ${val} tickets (${pct}%)`
          },
          afterLabel: () => ' Haz clic para ver detalle',
        },
      },
    },
  }), [estadosData, totalTicketsByState])

  const renderDeltaBadge = (delta, invertGood = false) => {
    if (delta === null) {
      return <span className="ux-delta-badge is-neutral">Sin comparativa</span>
    }
    const isZero = delta === 0
    const isGood = invertGood ? delta < 0 : delta > 0
    const tone = isZero ? 'is-neutral' : isGood ? 'is-positive' : 'is-warning'
    const Icon = delta >= 0 ? IconTrendingUp : IconTrendingDown
    return (
      <span className={`ux-delta-badge ${tone}`} title="Variación respecto al mes anterior">
        {!isZero && <Icon size={12} />}
        {delta > 0 ? `+${delta}%` : `${delta}%`} vs mes ant.
      </span>
    )
  }

  const selectedEstadoMeta = selectedEstado
    ? ESTADO_META[selectedEstado.estado] || {
        label: selectedEstado.estado,
        color: '#64748b',
        severity: 'secondary',
        desc: 'Estado operativo de incidencias registradas en el sistema.',
      }
    : null

  return (
    <div className="dashboard-page">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Control Helpdesk</h1>
          <p className="page-subtitle">
            Estado operativo en un vistazo: volumen, tiempos SLA y desempeño del Bot de IA
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

      {/* NIVEL 1 (Pirámide Invertida): Resumen Ejecutivo — KPIs con Sparklines y Contexto */}
      {loading ? (
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card skeleton-card">
              <div className="skeleton-text">
                <Skeleton width="55%" height="14px" className="mb-2" />
                <Skeleton width="45%" height="30px" className="mb-2" />
                <Skeleton width="80%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          {/* Esquina superior izquierda: indicador macro principal */}
          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Total de Tickets</span>
              <div className="kpi-icon-sm bg-blue"><IconTicket size={18} /></div>
            </div>
            <div className="kpi-mid">
              <div className="kpi-value">{volume.total_tickets ?? 0}</div>
              <Sparkline data={volSeries} color="#0284c7" />
            </div>
            <div className="kpi-bottom">
              {renderDeltaBadge(volDelta, false)}
              <span className="kpi-subtext">{globalResolutionRate}% resueltos</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">1ª Respuesta (FRT)</span>
              <div className="kpi-icon-sm bg-amber"><IconClockHour4 size={18} /></div>
            </div>
            <div className="kpi-mid">
              <div className="kpi-value">{frtAvg != null ? `${frtAvg}h` : '—'}</div>
              <Sparkline data={frtSeries} color="#d97706" />
            </div>
            <div className="kpi-bottom">
              {renderDeltaBadge(frtDelta, true)}
              <span className="kpi-subtext">Meta ≤ 4h</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Resolución (MTTR)</span>
              <div className="kpi-icon-sm bg-emerald"><IconHourglassHigh size={18} /></div>
            </div>
            <div className="kpi-mid">
              <div className="kpi-value">{mttrAvg != null ? `${mttrAvg}h` : '—'}</div>
              <Sparkline data={mttrSeries} color="#059669" />
            </div>
            <div className="kpi-bottom">
              {renderDeltaBadge(mttrDelta, true)}
              <span className="kpi-subtext">
                {times.mttr_hours?.minimum != null
                  ? `Mín ${times.mttr_hours.minimum}h · Máx ${times.mttr_hours.maximum}h`
                  : 'Promedio histórico'}
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Autonomía del Bot IA</span>
              <div className="kpi-icon-sm bg-purple"><IconRobot size={18} /></div>
            </div>
            <div className="kpi-mid">
              <div className="kpi-value">
                {impact.bot_autonomous_resolution_rate_percent != null
                  ? `${impact.bot_autonomous_resolution_rate_percent}%`
                  : '—'}
              </div>
              <span className={`ux-delta-badge ${botAutoRate >= 60 ? 'is-positive' : 'is-warning'}`}>
                {botAutoRate >= 60 ? 'En meta' : 'Bajo meta'}
              </span>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-subtext">
                Escalado a humano: <b>{impact.escalation_to_human_rate_percent ?? 0}%</b>
              </span>
              <span className="kpi-subtext">Meta ≥ 60%</span>
            </div>
          </div>
        </div>
      )}

      {/* NIVEL 2: Tendencias y Contexto (Grid 12 columnas: 7 + 5) */}
      <div className="analytics-grid-12">
        {/* Gráfico de tendencia con Toggle (Tiempos vs Volumen) */}
        <div className="chart-card col-span-7">
          <div className="chart-header-split">
            <div className="chart-title-block">
              <div className="chart-title-row">
                <IconChartBar size={18} className="text-blue" />
                <h3 className="chart-title">
                  {trendMode === 'times'
                    ? '¿Cómo evolucionan FRT y MTTR en los últimos 6 meses?'
                    : '¿Cuántos tickets ingresan vs. cuántos se resuelven?'}
                </h3>
              </div>
              <p className="chart-subtitle">
                Pasa el cursor sobre cualquier mes para ver el desglose completo
              </p>
            </div>

            <div className="ux-segmented" role="tablist" aria-label="Cambiar métrica del gráfico">
              <button
                type="button"
                role="tab"
                aria-selected={trendMode === 'times'}
                className={`ux-segment-btn ${trendMode === 'times' ? 'is-active' : ''}`}
                onClick={() => setTrendMode('times')}
              >
                Tiempos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trendMode === 'volume'}
                className={`ux-segment-btn ${trendMode === 'volume' ? 'is-active' : ''}`}
                onClick={() => setTrendMode('volume')}
              >
                Volumen
              </button>
            </div>
          </div>

          <div className="chart-body">
            {loading ? (
              <Skeleton height="260px" />
            ) : trendLabels.length > 0 ? (
              trendMode === 'times' ? (
                <Line data={timesChartData} options={trendOptions} />
              ) : (
                <Bar data={volumeChartData} options={trendOptions} />
              )
            ) : (
              <div className="chart-empty">No hay datos de períodos disponibles</div>
            )}
          </div>
        </div>

        {/* Distribución por estado + Micro-tabla interactiva con barras */}
        <div className="chart-card col-span-5">
          <div className="chart-header-split">
            <div className="chart-title-block">
              <div className="chart-title-row">
                <IconActivity size={18} className="text-blue" />
                <h3 className="chart-title">¿Dónde se concentran las incidencias?</h3>
              </div>
              <p className="chart-subtitle">
                Haz clic en un estado para inspeccionar su detalle
              </p>
            </div>
          </div>

          {loading ? (
            <div className="chart-body"><Skeleton height="240px" /></div>
          ) : estadosData.length > 0 ? (
            <div className="donut-micro-layout">
              <div className="donut-wrap">
                <Doughnut data={donutData} options={donutOptions} />
                <div className="donut-center">
                  <span className="donut-total">{totalTicketsByState}</span>
                  <span className="donut-label">Total</span>
                </div>
              </div>

              {/* Micro-tabla con barras horizontales integradas */}
              <div className="estado-list">
                {estadosData.map((e) => {
                  const meta = ESTADO_META[e.estado] || { label: e.estado, color: '#94a3b8' }
                  const count = Number(e.total)
                  const pct = totalTicketsByState > 0 ? Math.round((count / totalTicketsByState) * 100) : 0
                  const isSelected = selectedEstado?.estado === e.estado
                  return (
                    <button
                      key={e.estado}
                      type="button"
                      className={`estado-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedEstado(e)}
                    >
                      <div className="estado-item-top">
                        <span className="estado-dot" style={{ background: meta.color }} />
                        <span className="estado-name">{meta.label}</span>
                        <span className="estado-count">{count}</span>
                        <span className="estado-pct">{pct}%</span>
                      </div>
                      <div className="estado-bar-track">
                        <div
                          className="estado-bar-fill"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="chart-body">
              <div className="chart-empty">No hay datos de estados disponibles</div>
            </div>
          )}
        </div>
      </div>

      {/* NIVEL 3: Cumplimiento de Metas (Bullet Charts) + Operaciones en Tabs */}
      <div className="dashboard-sections-12">
        {/* Gráficos de Bala (Bullet Charts) */}
        <div className="section-card col-span-6">
          <div className="section-header">
            <div className="section-icon"><IconTargetArrow size={20} /></div>
            <div>
              <h2 className="section-title">Cumplimiento de Metas Operativas</h2>
              <p className="section-desc-inline">
                Comparativa rápida del desempeño actual frente a los objetivos del servicio
              </p>
            </div>
          </div>

          <div className="bullets-stack">
            <BulletChart
              label="Tasa de Resolución Global"
              value={globalResolutionRate}
              target={85}
              max={100}
              unit="%"
              helper={`${globalTotals?.tickets_resueltos ?? 0} de ${globalTotals?.n ?? volume.total_tickets ?? 0} tickets resueltos`}
            />
            <BulletChart
              label="Autonomía del Bot de IA"
              value={botAutoRate}
              target={60}
              max={100}
              unit="%"
              helper={`Escalados a humano: ${impact.escalation_to_human_rate_percent ?? 0}%`}
            />
            <BulletChart
              label="Tiempo de Primera Respuesta (FRT)"
              value={frtAvg ?? 0}
              target={4}
              max={Math.max(12, Math.ceil((frtAvg ?? 0) * 1.25))}
              unit="h"
              invert
              helper="Menor tiempo indica atención más ágil al campus"
            />
          </div>
        </div>

        {/* Contenedor con Pestañas: Accesos Rápidos / Salud del Entorno */}
        <div className="section-card col-span-6">
          <div className="section-header-split">
            <div className="section-header">
              <div className="section-icon">
                {opsTab === 'actions' ? <IconSparkles size={20} /> : <IconActivity size={20} />}
              </div>
              <h2 className="section-title">
                {opsTab === 'actions' ? 'Accesos Rápidos' : 'Salud del Entorno'}
              </h2>
            </div>

            <div className="ux-segmented" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={opsTab === 'actions'}
                className={`ux-segment-btn ${opsTab === 'actions' ? 'is-active' : ''}`}
                onClick={() => setOpsTab('actions')}
              >
                Accesos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={opsTab === 'health'}
                className={`ux-segment-btn ${opsTab === 'health' ? 'is-active' : ''}`}
                onClick={() => setOpsTab('health')}
              >
                Servicios
              </button>
            </div>
          </div>

          {opsTab === 'actions' ? (
            <div className="actions-grid">
              <Link to="/tickets" className="action-card">
                <div className="action-card-icon icon-blue"><IconTicket size={22} /></div>
                <div className="action-card-info">
                  <span className="action-title">Bandeja de Tickets</span>
                  <span className="action-desc">Gestiona incidencias de alumnos y profesores</span>
                </div>
                <IconArrowRight size={18} className="action-arrow" />
              </Link>
              <Link to="/bot-history" className="action-card">
                <div className="action-card-icon icon-purple"><IconRobot size={22} /></div>
                <div className="action-card-info">
                  <span className="action-title">Historial del Bot IA</span>
                  <span className="action-desc">Monitorea consultas, respuestas e intenciones</span>
                </div>
                <IconArrowRight size={18} className="action-arrow" />
              </Link>
              <Link to="/reports" className="action-card">
                <div className="action-card-icon icon-emerald"><IconChartBar size={22} /></div>
                <div className="action-card-info">
                  <span className="action-title">Reportes & Métricas FRT / MTTR</span>
                  <span className="action-desc">Análisis por período, técnico, categoría y exportaciones</span>
                </div>
                <IconArrowRight size={18} className="action-arrow" />
              </Link>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Drawer lateral deslizable para inspección de un estado sin abandonar el Dashboard */}
      <DetailDrawer
        open={Boolean(selectedEstado)}
        title={selectedEstadoMeta?.label || 'Detalle de Estado'}
        subtitle="Inspección rápida de incidencias en este estado"
        onClose={() => setSelectedEstado(null)}
        footer={
          <>
            <Button
              label="Cerrar"
              severity="secondary"
              outlined
              size="small"
              onClick={() => setSelectedEstado(null)}
            />
            <Link to="/tickets">
              <Button
                label="Ir a Bandeja de Tickets"
                size="small"
                icon={<IconExternalLink size={15} />}
                iconPos="right"
              />
            </Link>
          </>
        }
      >
        {selectedEstado && selectedEstadoMeta && (
          <>
            <div className="ux-drawer-kpi-grid">
              <div className="ux-drawer-stat">
                <span className="ux-drawer-stat-label">Tickets en estado</span>
                <span className="ux-drawer-stat-value">{selectedEstado.total}</span>
                <span className="ux-drawer-stat-sub">de {totalTicketsByState} totales</span>
              </div>
              <div className="ux-drawer-stat">
                <span className="ux-drawer-stat-label">Participación</span>
                <span className="ux-drawer-stat-value">
                  {totalTicketsByState > 0
                    ? `${Math.round((Number(selectedEstado.total) / totalTicketsByState) * 100)}%`
                    : '0%'}
                </span>
                <span className="ux-drawer-stat-sub">del volumen total</span>
              </div>
            </div>

            <div className="ux-drawer-section">
              <h4 className="ux-drawer-section-title">Descripción Operativa</h4>
              <p className="drawer-desc-text">{selectedEstadoMeta.desc}</p>
              <Tag
                value={selectedEstadoMeta.label}
                severity={selectedEstadoMeta.severity}
                rounded
              />
            </div>

            <div className="ux-drawer-section">
              <h4 className="ux-drawer-section-title">Comparativa con el Total</h4>
              <BulletChart
                label="Proporción sobre el total de incidencias"
                value={
                  totalTicketsByState > 0
                    ? Math.round((Number(selectedEstado.total) / totalTicketsByState) * 100)
                    : 0
                }
                target={selectedEstado.estado === 'RESUELTO' ? 85 : 25}
                max={100}
                unit="%"
                invert={selectedEstado.estado !== 'RESUELTO' && selectedEstado.estado !== 'CERRADO'}
                helper={`${selectedEstado.total} tickets registrados en ${selectedEstadoMeta.label}`}
              />
            </div>
          </>
        )}
      </DetailDrawer>
    </div>
  )
}
