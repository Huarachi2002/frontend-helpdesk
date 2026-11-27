import React, { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import {
  IconTicket,
  IconClockHour4,
  IconHourglassHigh,
  IconRobot,
  IconChartBar,
  IconDownload,
  IconCalendar,
  IconFileSpreadsheet,
  IconTable,
  IconFileTypePdf,
  IconReportAnalytics,
  IconTrendingUp,
  IconTrendingDown,
  IconFilterOff,
  IconArrowRight,
  IconFolders,
} from '@tabler/icons-react'
import {
  getVolumeReport,
  getImpactReport,
  getTimesReport,
  exportReport,
} from '../../api/reports.js'
import { chartColors } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import Sparkline from '../../components/ui/Sparkline.jsx'
import BulletChart from '../../components/ui/BulletChart.jsx'
import DetailDrawer from '../../components/ui/DetailDrawer.jsx'
import MetricsReportPanel, { formatHours } from './MetricsReportPanel.jsx'
import { exportDateRangeSchema, validateSchema } from '../../schemas/index.js'
import '../../components/ui/uxWidgets.css'
import './ReportView.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

function computeDelta(series) {
  if (!series || series.length < 2) return null
  const prev = Number(series[series.length - 2])
  const curr = Number(series[series.length - 1])
  if (!prev || Number.isNaN(prev) || Number.isNaN(curr)) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export default function ReportView() {
  const { showToast } = useToast()

  const [volume, setVolume] = useState({})
  const [impact, setImpact] = useState({})
  const [times, setTimes] = useState({})
  const [loadingCharts, setLoadingCharts] = useState(true)

  // Revelación progresiva: pestañas principales, toggle del gráfico, cross-filter y drawer de exportación
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'metrics'
  const [overviewChartMode, setOverviewChartMode] = useState('volume') // 'volume' | 'impact'
  const [selectedCategoryName, setSelectedCategoryName] = useState(null)
  const [metricsCategoryFilterName, setMetricsCategoryFilterName] = useState(null)

  const [exportDrawerOpen, setExportDrawerOpen] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportFieldErrors, setExportFieldErrors] = useState({})
  const [exportingFormat, setExportingFormat] = useState(null)

  useEffect(() => {
    let isMounted = true
    const loadReports = async () => {
      try {
        const [v, i, t] = await Promise.all([
          getVolumeReport(),
          getImpactReport(),
          getTimesReport(),
        ])
        if (isMounted) {
          setVolume(v.data || {})
          setImpact(i.data || {})
          setTimes(t.data || {})
        }
      } catch (err) {
        console.error('Error al cargar reportes', err)
      } finally {
        if (isMounted) setLoadingCharts(false)
      }
    }
    loadReports()

    return () => {
      isMounted = false
    }
  }, [])

  const periodCounts = useMemo(
    () => (volume.by_period ?? []).map((p) => Number(p.count || 0)),
    [volume.by_period]
  )
  const volumeDelta = useMemo(() => computeDelta(periodCounts), [periodCounts])

  const sortedCategories = useMemo(() => {
    const raw = volume.by_category ?? []
    return [...raw].sort((a, b) => Number(b.count) - Number(a.count))
  }, [volume.by_category])

  const totalCategoryTickets = useMemo(
    () => sortedCategories.reduce((acc, c) => acc + Number(c.count || 0), 0),
    [sortedCategories]
  )

  const botAutoRate = Number(impact.bot_autonomous_resolution_rate_percent ?? 0)
  const escalationRate = Number(impact.escalation_to_human_rate_percent ?? 0)
  const frtAvg = times.frt_hours_average != null ? Number(times.frt_hours_average) : null
  const mttrAvg = times.mttr_hours?.average != null ? Number(times.mttr_hours.average) : null

  // Gráfico Volumen por período
  const volumeChartData = useMemo(
    () => ({
      labels: (volume.by_period ?? []).map((p) => p.month),
      datasets: [
        {
          label: 'Tickets',
          data: periodCounts,
          backgroundColor: chartColors.blue,
          hoverBackgroundColor: chartColors.palette[0],
          borderRadius: 8,
        },
      ],
    }),
    [volume.by_period, periodCounts]
  )

  // Gráfico por categoría (con resaltado de cross-filter)
  const categoryChartData = useMemo(
    () => ({
      labels: sortedCategories.map((c) => c.name),
      datasets: [
        {
          data: sortedCategories.map((c) => Number(c.count || 0)),
          backgroundColor: sortedCategories.map((c, idx) => {
            const base = chartColors.palette[idx % chartColors.palette.length]
            if (!selectedCategoryName || selectedCategoryName === c.name) return base
            return 'rgba(148, 163, 184, 0.25)'
          }),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    }),
    [sortedCategories, selectedCategoryName]
  )

  // Gráfico Bot vs Humano
  const impactChartData = useMemo(
    () => ({
      labels: ['Resueltos por Bot', 'Escalados a Humano'],
      datasets: [
        {
          label: 'Porcentaje (%)',
          data: [botAutoRate, escalationRate],
          backgroundColor: [chartColors.emerald, chartColors.amber],
          borderRadius: 8,
          maxBarThickness: 68,
        },
      ],
    }),
    [botAutoRate, escalationRate]
  )

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              if (overviewChartMode === 'impact') {
                return ` ${ctx.label}: ${ctx.parsed.y}%`
              }
              const total = Number(volume.total_tickets || 0)
              const pct = total > 0 ? Math.round((ctx.parsed.y / total) * 100) : 0
              return ` ${ctx.parsed.y} tickets (${pct}% del historial)`
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(15, 23, 42, 0.05)' },
          ticks: {
            precision: 0,
            callback: (v) => (overviewChartMode === 'impact' ? `${v}%` : v),
          },
        },
        x: { grid: { display: false } },
      },
    }),
    [overviewChartMode, volume.total_tickets]
  )

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      onClick: (_, elements) => {
        if (elements?.length > 0) {
          const clicked = sortedCategories[elements[0].index]
          if (clicked) {
            setSelectedCategoryName((prev) => (prev === clicked.name ? null : clicked.name))
          }
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
              const pct = totalCategoryTickets > 0 ? Math.round((val / totalCategoryTickets) * 100) : 0
              return ` ${ctx.label}: ${val} tickets (${pct}%)`
            },
            afterLabel: () => ' Haz clic para seleccionar categoría',
          },
        },
      },
    }),
    [sortedCategories, totalCategoryTickets]
  )

  const inspectCategoryInMetrics = (categoryName) => {
    setMetricsCategoryFilterName(categoryName)
    setActiveTab('metrics')
  }

  const doExport = async (format) => {
    const validation = validateSchema(exportDateRangeSchema, {
      date_from: exportFrom,
      date_to: exportTo,
    })
    if (!validation.success) {
      setExportFieldErrors(validation.fieldErrors)
      showToast({
        severity: 'warn',
        summary: 'Rango de Fechas Inválido',
        detail: validation.firstError,
        life: 3500,
      })
      return
    }

    setExportFieldErrors({})
    setExportingFormat(format)
    try {
      const params = {}
      if (validation.data.date_from) params.date_from = validation.data.date_from
      if (validation.data.date_to) params.date_to = validation.data.date_to

      const response = await exportReport(format, params)

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte_helpdesk_${format}.${format === 'excel' ? 'xlsx' : format}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast({
        severity: 'success',
        summary: 'Descarga Iniciada',
        detail: `Reporte en formato ${format.toUpperCase()} generado correctamente.`,
        life: 3500,
      })
    } catch (err) {
      console.error('Error al exportar reporte', err)
      showToast({
        severity: 'error',
        summary: 'Error en la Exportación',
        detail: 'No fue posible generar el archivo de reporte.',
        life: 4000,
      })
    } finally {
      setExportingFormat(null)
    }
  }

  const selectedCategoryObj = sortedCategories.find((c) => c.name === selectedCategoryName) || null

  return (
    <div className="reports-view">
      {/* Header con botón de exportación en Drawer (Progressive Disclosure) */}
      <div className="page-header">
        <div className="header-titles">
          <h1 className="page-title">Métricas y Reportes Analíticos</h1>
          <p className="page-subtitle">
            Rendimiento del servicio, distribución de incidencias y análisis detallado de FRT y MTTR
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="header-actions">
            <Button
              label="Exportar consolidado"
              severity="secondary"
              outlined
              size="small"
              icon={<IconDownload size={16} />}
              onClick={() => setExportDrawerOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Pestañas principales de la vista (Revelación Progresiva) */}
      <div className="reports-tabs-bar" role="tablist" aria-label="Secciones de reportes">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`reports-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <IconChartBar size={16} />
          <span>Resumen Analítico</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'metrics'}
          className={`reports-tab-btn ${activeTab === 'metrics' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <IconReportAnalytics size={16} />
          <span>Métricas FRT / MTTR Detalladas</span>
        </button>
      </div>

      {/* TAB 1: Resumen Analítico (KPIs Históricos + Grid 12 columnas: 7 + 5) */}
      {activeTab === 'overview' && (
        <>
          {loadingCharts ? (
            <div className="kpi-row">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="kpi-card skeleton-kpi">
                  <Skeleton width="50%" height="14px" className="mb-2" />
                  <Skeleton width="40%" height="28px" className="mb-2" />
                  <Skeleton width="75%" height="12px" />
                </div>
              ))}
            </div>
          ) : (
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-label">Total Tickets</span>
                  <div className="kpi-icon-pill bg-blue"><IconTicket size={18} /></div>
                </div>
                <div className="kpi-mid">
                  <div className="kpi-value">{volume.total_tickets ?? '—'}</div>
                  <Sparkline data={periodCounts} color="#0284c7" />
                </div>
                <div className="kpi-footer-row">
                  {volumeDelta !== null ? (
                    <span className={`ux-delta-badge ${volumeDelta > 0 ? 'is-warning' : 'is-positive'}`}>
                      {volumeDelta >= 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
                      {volumeDelta > 0 ? `+${volumeDelta}%` : `${volumeDelta}%`} vs mes ant.
                    </span>
                  ) : (
                    <span className="ux-delta-badge is-neutral">Historial acumulado</span>
                  )}
                  <span className="kpi-note">{sortedCategories.length} categorías</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-label">FRT Promedio</span>
                  <div className="kpi-icon-pill bg-amber"><IconClockHour4 size={18} /></div>
                </div>
                <div className="kpi-mid">
                  <div className="kpi-value">{formatHours(frtAvg)}</div>
                  {frtAvg != null && (
                    <span className={`ux-delta-badge ${frtAvg <= 4 ? 'is-positive' : 'is-warning'}`}>
                      {frtAvg <= 4 ? 'En meta' : 'Sobre meta'}
                    </span>
                  )}
                </div>
                <div className="kpi-footer-row">
                  <span className="kpi-note">Primera respuesta</span>
                  <span className="kpi-note">Meta ≤ 4h</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-label">MTTR Promedio</span>
                  <div className="kpi-icon-pill bg-emerald"><IconHourglassHigh size={18} /></div>
                </div>
                <div className="kpi-mid">
                  <div className="kpi-value">{formatHours(mttrAvg)}</div>
                  {mttrAvg != null && (
                    <span className={`ux-delta-badge ${mttrAvg <= 24 ? 'is-positive' : 'is-warning'}`}>
                      {mttrAvg <= 24 ? 'Óptimo' : 'Revisar'}
                    </span>
                  )}
                </div>
                <div className="kpi-footer-row">
                  <span className="kpi-note">
                    {times.mttr_hours?.minimum != null
                      ? `Mín. ${formatHours(times.mttr_hours.minimum)} · Máx. ${formatHours(times.mttr_hours.maximum)}`
                      : 'Resolución definitiva'}
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-label">Autonomía Bot IA</span>
                  <div className="kpi-icon-pill bg-purple"><IconRobot size={18} /></div>
                </div>
                <div className="kpi-mid">
                  <div className="kpi-value">
                    {impact.bot_autonomous_resolution_rate_percent != null ? `${botAutoRate}%` : '—'}
                  </div>
                  <span className={`ux-delta-badge ${botAutoRate >= 60 ? 'is-positive' : 'is-warning'}`}>
                    {botAutoRate >= 60 ? 'En meta' : 'Bajo meta'}
                  </span>
                </div>
                <div className="kpi-footer-row">
                  <span className="kpi-note">Escalado: <b>{escalationRate}%</b></span>
                  <span className="kpi-note">Meta ≥ 60%</span>
                </div>
              </div>
            </div>
          )}

          <div className="overview-grid-12">
          {/* Gráfico principal con Toggle (Volumen vs Impacto Bot) */}
          <div className="chart-card col-span-7">
            <div className="chart-header">
              <div className="chart-title-block">
                <div className="chart-title-wrap">
                  {overviewChartMode === 'volume' ? (
                    <IconChartBar size={18} className="text-blue" />
                  ) : (
                    <IconRobot size={18} className="text-emerald" />
                  )}
                  <h3 className="chart-title">
                    {overviewChartMode === 'volume'
                      ? '¿Cómo evoluciona el volumen de tickets por período?'
                      : '¿Cuánto resuelve el Bot sin intervención humana?'}
                  </h3>
                </div>
                <p className="chart-subtitle">
                  {overviewChartMode === 'volume'
                    ? 'Tendencia histórica mensual de solicitudes ingresadas'
                    : 'Proporción de consultas resueltas automáticamente vs. escaladas a técnicos'}
                </p>
              </div>

              <div className="metrics-segmented" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={overviewChartMode === 'volume'}
                  className={`metrics-segment ${overviewChartMode === 'volume' ? 'is-active' : ''}`}
                  onClick={() => setOverviewChartMode('volume')}
                >
                  Volumen
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={overviewChartMode === 'impact'}
                  className={`metrics-segment ${overviewChartMode === 'impact' ? 'is-active' : ''}`}
                  onClick={() => setOverviewChartMode('impact')}
                >
                  Impacto Bot
                </button>
              </div>
            </div>

            <div className="chart-body">
              {loadingCharts ? (
                <Skeleton height="260px" />
              ) : overviewChartMode === 'volume' ? (
                <Bar data={volumeChartData} options={barOptions} />
              ) : (
                <Bar data={impactChartData} options={barOptions} />
              )}
            </div>

            {overviewChartMode === 'impact' && !loadingCharts && (
              <div className="impact-bullets-footer">
                <BulletChart
                  label="Resolución autónoma del Bot"
                  value={botAutoRate}
                  target={60}
                  max={100}
                  unit="%"
                  helper="Objetivo mínimo de autoservicio en consultas frecuentes"
                />
              </div>
            )}
          </div>

          {/* Distribución por categoría con Micro-tabla de barras y Cross-filtering */}
          <div className="chart-card col-span-5">
            <div className="chart-header">
              <div className="chart-title-block">
                <div className="chart-title-wrap">
                  <IconFolders size={18} className="text-purple" />
                  <h3 className="chart-title">¿Qué categorías concentran más carga?</h3>
                </div>
                <p className="chart-subtitle">
                  Haz clic en una categoría para resaltarla o analizar su FRT/MTTR
                </p>
              </div>
              {selectedCategoryName && (
                <button
                  type="button"
                  className="btn-reset-chip"
                  onClick={() => setSelectedCategoryName(null)}
                >
                  <IconFilterOff size={13} />
                  Limpiar
                </button>
              )}
            </div>

            {loadingCharts ? (
              <div className="chart-body"><Skeleton height="260px" /></div>
            ) : sortedCategories.length === 0 ? (
              <div className="chart-body">
                <div className="metrics-empty">No hay categorías con incidencias registradas.</div>
              </div>
            ) : (
              <div className="category-micro-layout">
                <div className="category-donut-box">
                  <Doughnut data={categoryChartData} options={doughnutOptions} />
                  <div className="category-donut-center">
                    <span className="donut-big-num">
                      {selectedCategoryObj ? selectedCategoryObj.count : totalCategoryTickets}
                    </span>
                    <span className="donut-small-lbl">
                      {selectedCategoryObj ? 'En categoría' : 'Total'}
                    </span>
                  </div>
                </div>

                {/* Micro-tabla con barras horizontales integradas */}
                <div className="category-bars-list">
                  {sortedCategories.map((c, idx) => {
                    const count = Number(c.count || 0)
                    const pct = totalCategoryTickets > 0
                      ? Math.round((count / totalCategoryTickets) * 100)
                      : 0
                    const color = chartColors.palette[idx % chartColors.palette.length]
                    const isSelected = selectedCategoryName === c.name
                    return (
                      <button
                        key={c.name}
                        type="button"
                        className={`category-bar-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() =>
                          setSelectedCategoryName((prev) => (prev === c.name ? null : c.name))
                        }
                      >
                        <div className="category-bar-top">
                          <span className="cat-dot" style={{ background: color }} />
                          <span className="cat-name">{c.name}</span>
                          <span className="cat-count">{count}</span>
                          <span className="cat-pct">{pct}%</span>
                        </div>
                        <div className="cat-track">
                          <div
                            className="cat-fill"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Acción de filtro cruzado hacia el Tab de Métricas FRT / MTTR */}
                {selectedCategoryObj && (
                  <div className="cross-filter-banner">
                    <span>
                      Categoría activa: <b>{selectedCategoryObj.name}</b> ({selectedCategoryObj.count} tickets)
                    </span>
                    <button
                      type="button"
                      className="cross-filter-cta"
                      onClick={() => inspectCategoryInMetrics(selectedCategoryObj.name)}
                    >
                      Ver FRT / MTTR
                      <IconArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* TAB 2: Reporte de Métricas FRT / MTTR */}
      {activeTab === 'metrics' && (
        <MetricsReportPanel
          initialCategoryName={metricsCategoryFilterName}
          onConsumeInitialCategory={() => setMetricsCategoryFilterName(null)}
        />
      )}

      {/* Drawer Lateral de Exportación Consolidada (Progressive Disclosure) */}
      <DetailDrawer
        open={exportDrawerOpen}
        title="Exportar Reporte Consolidado"
        subtitle="Descarga el historial general de incidencias en el formato que necesites"
        onClose={() => setExportDrawerOpen(false)}
        footer={
          <Button
            label="Cerrar"
            severity="secondary"
            outlined
            size="small"
            onClick={() => setExportDrawerOpen(false)}
          />
        }
      >
        <div className="drawer-export-form">
          <div className="date-field-col">
            <label className="date-label">Desde (opcional)</label>
            <div className="date-input-wrap">
              <IconCalendar size={16} className="calendar-icon" />
              <input
                type="date"
                className={`date-input w-full ${exportFieldErrors.date_from ? 'input-invalid' : ''}`}
                aria-invalid={Boolean(exportFieldErrors.date_from)}
                value={exportFrom}
                onChange={(e) => {
                  setExportFrom(e.target.value)
                  if (exportFieldErrors.date_from || exportFieldErrors.date_to) {
                    setExportFieldErrors({})
                  }
                }}
              />
            </div>
            {exportFieldErrors.date_from && (
              <span className="field-error-text">{exportFieldErrors.date_from}</span>
            )}
          </div>

          <div className="date-field-col">
            <label className="date-label">Hasta (opcional)</label>
            <div className="date-input-wrap">
              <IconCalendar size={16} className="calendar-icon" />
              <input
                type="date"
                className={`date-input w-full ${exportFieldErrors.date_to ? 'input-invalid' : ''}`}
                aria-invalid={Boolean(exportFieldErrors.date_to)}
                value={exportTo}
                onChange={(e) => {
                  setExportTo(e.target.value)
                  if (exportFieldErrors.date_from || exportFieldErrors.date_to) {
                    setExportFieldErrors({})
                  }
                }}
              />
            </div>
            {exportFieldErrors.date_to && (
              <span className="field-error-text">{exportFieldErrors.date_to}</span>
            )}
          </div>

          <div className="ux-drawer-section">
            <h4 className="ux-drawer-section-title">Selecciona el formato</h4>
            <div className="drawer-export-buttons">
              <Button
                label="Descargar CSV"
                severity="info"
                outlined
                size="small"
                loading={exportingFormat === 'csv'}
                onClick={() => doExport('csv')}
                icon={<IconFileSpreadsheet size={16} />}
              />
              <Button
                label="Descargar Excel (.xlsx)"
                severity="success"
                outlined
                size="small"
                loading={exportingFormat === 'excel'}
                onClick={() => doExport('excel')}
                icon={<IconTable size={16} />}
              />
              <Button
                label="Descargar PDF"
                severity="danger"
                outlined
                size="small"
                loading={exportingFormat === 'pdf'}
                onClick={() => doExport('pdf')}
                icon={<IconFileTypePdf size={16} />}
              />
            </div>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
