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
  IconSparkles,
  IconChartBar,
  IconDownload,
  IconCalendar,
  IconFileSpreadsheet,
  IconTable,
  IconFileTypePdf,
} from '@tabler/icons-react'
import {
  getVolumeReport,
  getImpactReport,
  getTimesReport,
  exportReport,
} from '../../api/reports.js'
import { chartColors } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
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

export default function ReportView() {
  const { showToast } = useToast()

  const [volume, setVolume] = useState({})
  const [impact, setImpact] = useState({})
  const [times, setTimes] = useState({})
  const [loadingCharts, setLoadingCharts] = useState(true)

  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
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

  // Gráfico Volumen por período
  const volumeChartData = useMemo(
    () => ({
      labels: (volume.by_period ?? []).map((p) => p.month),
      datasets: [
        {
          label: 'Tickets',
          data: (volume.by_period ?? []).map((p) => p.count),
          backgroundColor: chartColors.blue,
          hoverBackgroundColor: chartColors.palette[0],
          borderRadius: 8,
        },
      ],
    }),
    [volume.by_period]
  )

  // Gráfico por categoría
  const categoryChartData = useMemo(
    () => ({
      labels: (volume.by_category ?? []).map((c) => c.name),
      datasets: [
        {
          data: (volume.by_category ?? []).map((c) => c.count),
          backgroundColor: chartColors.palette,
          borderWidth: 0,
        },
      ],
    }),
    [volume.by_category]
  )

  // Gráfico Bot vs Humano
  const impactChartData = useMemo(
    () => ({
      labels: ['Resueltos por Bot', 'Escalados a Humano'],
      datasets: [
        {
          label: 'Porcentaje (%)',
          data: [
            impact.bot_autonomous_resolution_rate_percent ?? 0,
            impact.escalation_to_human_rate_percent ?? 0,
          ],
          backgroundColor: [chartColors.emerald, chartColors.amber],
          borderRadius: 8,
        },
      ],
    }),
    [
      impact.bot_autonomous_resolution_rate_percent,
      impact.escalation_to_human_rate_percent,
    ]
  )

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.04)' },
        },
        x: {
          grid: { display: false },
        },
      },
    }),
    []
  )

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 14, font: { size: 12 } },
        },
      },
      cutout: '65%',
    }),
    []
  )

  const doExport = async (format) => {
    setExportingFormat(format)
    try {
      const params = {}
      if (exportFrom) params.date_from = exportFrom
      if (exportTo) params.date_to = exportTo

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

  return (
    <div className="reports-view">
      {/* Header */}
      <div className="page-header">
        <div className="header-titles">
          <h1 className="page-title">Métricas y Reportes Analíticos</h1>
          <p className="page-subtitle">
            Visualización de rendimiento del servicio, categorización de incidencias y descargas en formatos ejecutivos
          </p>
        </div>
      </div>

      {/* Skeletons durante carga */}
      {loadingCharts ? (
        <div className="kpi-row">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="kpi-card skeleton-kpi">
              <Skeleton width="40%" height="28px" className="mb-2" />
              <Skeleton width="70%" height="14px" />
            </div>
          ))}
        </div>
      ) : (
        /* KPIs Rápidos */
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Total Tickets</span>
              <div className="kpi-icon-pill bg-blue">
                <IconTicket size={18} />
              </div>
            </div>
            <div className="kpi-value">{volume.total_tickets ?? '—'}</div>
            <div className="kpi-note">Historial acumulado</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">FRT Promedio</span>
              <div className="kpi-icon-pill bg-amber">
                <IconClockHour4 size={18} />
              </div>
            </div>
            <div className="kpi-value">
              {times.frt_hours_average != null ? `${times.frt_hours_average}h` : '—'}
            </div>
            <div className="kpi-note">Primera respuesta</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">MTTR Promedio</span>
              <div className="kpi-icon-pill bg-emerald">
                <IconHourglassHigh size={18} />
              </div>
            </div>
            <div className="kpi-value">
              {times.mttr_hours?.average != null ? `${times.mttr_hours.average}h` : '—'}
            </div>
            <div className="kpi-note">Resolución definitiva</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tasa Bot Autónomo</span>
              <div className="kpi-icon-pill bg-purple">
                <IconRobot size={18} />
              </div>
            </div>
            <div className="kpi-value">
              {impact.bot_autonomous_resolution_rate_percent != null
                ? `${impact.bot_autonomous_resolution_rate_percent}%`
                : '—'}
            </div>
            <div className="kpi-note">Sin intervención técnica</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Tasa Escalado</span>
              <div className="kpi-icon-pill bg-rose">
                <IconSparkles size={18} />
              </div>
            </div>
            <div className="kpi-value">
              {impact.escalation_to_human_rate_percent != null
                ? `${impact.escalation_to_human_rate_percent}%`
                : '—'}
            </div>
            <div className="kpi-note">Atendidos por agentes</div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Volumen por período */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <IconChartBar size={18} className="text-blue" />
              <h3 className="chart-title">Volumen de Tickets por Período</h3>
            </div>
          </div>
          <div className="chart-body">
            {loadingCharts ? (
              <Skeleton height="260px" />
            ) : (
              <Bar data={volumeChartData} options={barOptions} />
            )}
          </div>
        </div>

        {/* Distribución por categoría */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <IconChartBar size={18} className="text-purple" />
              <h3 className="chart-title">Distribución por Categoría</h3>
            </div>
          </div>
          <div className="chart-body doughnut-wrap">
            {loadingCharts ? (
              <Skeleton height="260px" />
            ) : (
              <Doughnut data={categoryChartData} options={doughnutOptions} />
            )}
          </div>
        </div>

        {/* Bot vs Humano */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <IconRobot size={18} className="text-emerald" />
              <h3 className="chart-title">Impacto: Bot Autónomo vs Humano</h3>
            </div>
          </div>
          <div className="chart-body">
            {loadingCharts ? (
              <Skeleton height="260px" />
            ) : (
              <Bar data={impactChartData} options={barOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Panel de Exportación */}
      <div className="export-panel">
        <div className="export-header">
          <div className="export-title-wrap">
            <IconDownload size={20} className="text-blue" />
            <div>
              <h3 className="export-title">Exportar Datos y Reportes Ejecutivos</h3>
              <p className="export-subtitle">
                Selecciona el rango de fechas y descarga los datos consolidados
              </p>
            </div>
          </div>
        </div>

        <div className="export-row">
          <div className="export-dates">
            <div className="date-field">
              <label className="date-label">Desde:</label>
              <div className="date-input-wrap">
                <IconCalendar size={16} className="calendar-icon" />
                <input
                  type="date"
                  className="date-input"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                />
              </div>
            </div>

            <div className="date-field">
              <label className="date-label">Hasta:</label>
              <div className="date-input-wrap">
                <IconCalendar size={16} className="calendar-icon" />
                <input
                  type="date"
                  className="date-input"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="export-buttons-group">
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
              label="Descargar Excel"
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
    </div>
  )
}

