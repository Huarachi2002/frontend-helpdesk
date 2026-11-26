import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Button } from 'primereact/button'
import { Skeleton } from 'primereact/skeleton'
import {
  IconReportAnalytics,
  IconCalendar,
  IconTicket,
  IconClockHour4,
  IconHourglassHigh,
  IconCircleCheck,
  IconFileSpreadsheet,
  IconTable,
  IconFileTypePdf,
  IconUser,
  IconFolders,
  IconChartLine,
  IconInfoCircle,
  IconChevronLeft,
  IconChevronRight,
  IconFilterOff,
  IconFilter,
} from '@tabler/icons-react'
import {
  getMetricsOptions,
  getMetricsReport,
  exportMetricsReport,
} from '../../api/reports.js'
import { chartColors } from '../../styles/theme.js'
import { useToast } from '../../context/ToastContext.jsx'
import BulletChart from '../../components/ui/BulletChart.jsx'
import DetailDrawer from '../../components/ui/DetailDrawer.jsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  Tooltip,
  Legend
)

const LEVELS = [
  { value: 'general', label: 'General', icon: IconChartLine, column: 'Período' },
  { value: 'technician', label: 'Por Técnico', icon: IconUser, column: 'Técnico de Soporte' },
  { value: 'category', label: 'Por Categoría', icon: IconFolders, column: 'Categoría' },
]

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

/** Fecha local en formato AAAA-MM-DD (sin pasar por UTC). */
function toDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const PRESETS = [
  { id: '7d', label: '7 días', range: () => [daysAgo(6), new Date()] },
  { id: '30d', label: '30 días', range: () => [daysAgo(29), new Date()] },
  { id: '90d', label: '90 días', range: () => [daysAgo(89), new Date()] },
  {
    id: 'month',
    label: 'Este mes',
    range: () => {
      const now = new Date()
      return [new Date(now.getFullYear(), now.getMonth(), 1), now]
    },
  },
  {
    id: 'year',
    label: 'Este año',
    range: () => {
      const now = new Date()
      return [new Date(now.getFullYear(), 0, 1), now]
    },
  },
]

/** Horas decimales → texto legible: "45 min", "2 h 15 min", "3 d 4 h". */
export function formatHours(hours) {
  if (hours === null || hours === undefined) return '—'
  const minutes = Math.round(Number(hours) * 60)
  if (minutes < 60) return `${minutes} min`
  const days = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  if (days > 0) return h > 0 ? `${days} d ${h} h` : `${days} d`
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Mensaje legible de un error de la API (prioriza el primer error de validación). */
function apiErrorMessage(data) {
  if (!data) return null
  const firstError = data.errors && Object.values(data.errors).flat()[0]
  return firstError || data.message || null
}

async function readBlobError(err) {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      return apiErrorMessage(JSON.parse(await data.text()))
    } catch (_) {
      return null
    }
  }
  return apiErrorMessage(data)
}

export default function MetricsReportPanel({
  initialCategoryName = null,
  onConsumeInitialCategory = null,
}) {
  const { showToast } = useToast()

  const [dateFrom, setDateFrom] = useState(() => toDateInput(daysAgo(29)))
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()))
  const [activePreset, setActivePreset] = useState('30d')
  const [level, setLevel] = useState('general')
  const [technicianId, setTechnicianId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [options, setOptions] = useState({ technicians: [], categories: [] })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRow, setSelectedRow] = useState(null)
  const requestId = useRef(0)

  const rangeError = dateFrom && dateTo && dateFrom > dateTo
    ? 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".'
    : null

  const params = useMemo(() => {
    const p = { date_from: dateFrom, date_to: dateTo, level }
    if (technicianId) p.technician_id = technicianId
    if (categoryId) p.category_id = categoryId
    return p
  }, [dateFrom, dateTo, level, technicianId, categoryId])

  const hasCustomFilters = Boolean(
    technicianId || categoryId || level !== 'general' || activePreset !== '30d'
  )

  // Opciones de filtros (técnicos y categorías)
  useEffect(() => {
    getMetricsOptions()
      .then(({ data }) => setOptions({
        technicians: data.technicians ?? [],
        categories: data.categories ?? [],
      }))
      .catch((err) => console.error('Error al cargar opciones del reporte', err))
  }, [])

  // Aplicar filtro cruzado entrante desde Resumen Analítico (si se seleccionó una categoría)
  useEffect(() => {
    if (!initialCategoryName || options.categories.length === 0) return
    const match = options.categories.find(
      (c) => c.name?.toLowerCase() === initialCategoryName.toLowerCase()
    )
    if (match) {
      setCategoryId(String(match.id))
      setLevel('category')
    }
    onConsumeInitialCategory?.()
  }, [initialCategoryName, options.categories, onConsumeInitialCategory])

  // Recalcular el reporte cada vez que cambia un filtro
  useEffect(() => {
    if (!dateFrom || !dateTo || rangeError) return
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    getMetricsReport(params)
      .then(({ data }) => {
        if (current === requestId.current) setReport(data)
      })
      .catch((err) => {
        if (current !== requestId.current) return
        console.error('Error al generar reporte de métricas', err)
        setError(apiErrorMessage(err?.response?.data) || 'No fue posible generar el reporte de métricas.')
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false)
      })
  }, [params, dateFrom, dateTo, rangeError])

  const applyPreset = (preset) => {
    const [from, to] = preset.range()
    setDateFrom(toDateInput(from))
    setDateTo(toDateInput(to))
    setActivePreset(preset.id)
  }

  const clearFilters = () => {
    applyPreset(PRESETS[1])
    setLevel('general')
    setTechnicianId('')
    setCategoryId('')
    setSelectedRow(null)
  }

  const doExport = async (format) => {
    if (rangeError) return
    setExportingFormat(format)
    try {
      const response = await exportMetricsReport(format, params)
      const ext = format === 'excel' ? 'xlsx' : format
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte_metricas_${level}_${dateFrom}_${dateTo}.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      showToast({
        severity: 'success',
        summary: 'Descarga iniciada',
        detail: `Reporte de métricas en ${format.toUpperCase()} generado correctamente.`,
        life: 3500,
      })
    } catch (err) {
      console.error('Error al exportar reporte de métricas', err)
      showToast({
        severity: 'error',
        summary: 'Error en la exportación',
        detail: (await readBlobError(err)) || 'No fue posible generar el archivo del reporte.',
        life: 4000,
      })
    } finally {
      setExportingFormat(null)
    }
  }

  const summary = report?.summary
  const rows = report?.rows ?? []
  const activeLevel = report?.filters?.level ?? level
  const levelInfo = LEVELS.find((l) => l.value === activeLevel) ?? LEVELS[0]

  const maxRowTickets = useMemo(
    () => rows.reduce((max, r) => Math.max(max, Number(r.total_tickets || 0)), 1),
    [rows]
  )

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRows)
  const paginatedRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [rows, startIndex, endIndex]
  )

  useEffect(() => {
    setPage(1)
  }, [params])

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  // Cross-filtering: aplicar una fila de técnico o categoría como filtro
  const applyRowCrossFilter = (row) => {
    if (!row) return
    if (activeLevel === 'technician') {
      const match = options.technicians.find(
        (t) => String(t.id) === String(row.key) || t.name === row.label
      )
      if (match) {
        setTechnicianId((prev) => (String(prev) === String(match.id) ? '' : String(match.id)))
      }
    } else if (activeLevel === 'category') {
      const match = options.categories.find(
        (c) => String(c.id) === String(row.key) || c.name === row.label
      )
      if (match) {
        setCategoryId((prev) => (String(prev) === String(match.id) ? '' : String(match.id)))
      }
    }
  }

  const chartData = useMemo(() => ({
    labels: rows.map((r) => r.label),
    datasets: [
      {
        type: 'bar',
        label: 'FRT promedio (h)',
        data: rows.map((r) => r.frt_avg),
        backgroundColor: chartColors.amber,
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: 'MTTR promedio (h)',
        data: rows.map((r) => r.mttr_avg),
        backgroundColor: chartColors.emerald,
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Tickets',
        data: rows.map((r) => r.total_tickets),
        borderColor: chartColors.blue,
        backgroundColor: chartColors.blue,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.3,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  }), [rows])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (_, elements) => {
      if (elements?.length > 0 && activeLevel !== 'general') {
        const clickedRow = rows[elements[0].index]
        if (clickedRow) applyRowCrossFilter(clickedRow)
      }
    },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === 'y1') return ` Tickets: ${ctx.parsed.y}`
            return ` ${ctx.dataset.label.replace(' (h)', '')}: ${formatHours(ctx.parsed.y)}`
          },
          afterBody: (items) => {
            const idx = items?.[0]?.dataIndex
            const row = rows[idx]
            if (!row) return []
            const extra = [
              '',
              `Respondidos: ${row.tickets_respondidos ?? 0} · Resueltos: ${row.tickets_resueltos ?? 0}`,
              `Tasa resolución: ${row.tasa_resolucion != null ? `${row.tasa_resolucion}%` : '—'}`,
            ]
            if (activeLevel !== 'general') {
              extra.push('Haz clic para filtrar por este elemento')
            }
            return extra
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left',
        title: { display: true, text: 'Horas' },
        grid: { color: 'rgba(15, 23, 42, 0.05)' },
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        title: { display: true, text: 'Tickets' },
        ticks: { precision: 0 },
        grid: { display: false },
      },
      x: { grid: { display: false } },
    },
  }), [rows, activeLevel, options])

  const technicianName = options.technicians.find((t) => String(t.id) === String(technicianId))?.name
  const categoryName = options.categories.find((c) => String(c.id) === String(categoryId))?.name

  const getRateTone = (rate) => {
    if (rate == null) return 'tone-primary'
    if (rate >= 80) return 'tone-good'
    if (rate >= 50) return 'tone-warn'
    return 'tone-bad'
  }

  return (
    <section className="metrics-panel">
      <div className="metrics-header">
        <div className="export-title-wrap">
          <IconReportAnalytics size={22} className="text-blue" />
          <div>
            <h3 className="export-title">Reporte de Métricas: Volumen, FRT y MTTR</h3>
            <p className="export-subtitle">
              Filtra por rango de fechas, técnico o categoría; haz clic en una fila para inspeccionar el detalle completo
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Fija (Sticky Header) */}
      <div className="metrics-filters is-sticky">
        <div className="metrics-filter-row">
          <div className="metrics-field">
            <span className="metrics-field-label">Rango de fechas</span>
            <div className="metrics-dates">
              <div className="date-input-wrap">
                <IconCalendar size={16} className="calendar-icon" />
                <input
                  type="date"
                  className="date-input"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null) }}
                  aria-label="Desde"
                />
              </div>
              <span className="metrics-dates-sep">a</span>
              <div className="date-input-wrap">
                <IconCalendar size={16} className="calendar-icon" />
                <input
                  type="date"
                  className="date-input"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => { setDateTo(e.target.value); setActivePreset(null) }}
                  aria-label="Hasta"
                />
              </div>
            </div>
            <div className="metrics-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`metrics-chip ${activePreset === p.id ? 'is-active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="metrics-field">
            <span className="metrics-field-label">Nivel del reporte</span>
            <div className="metrics-segmented" role="tablist">
              {LEVELS.map((l) => {
                const Icon = l.icon
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="tab"
                    aria-selected={level === l.value}
                    className={`metrics-segment ${level === l.value ? 'is-active' : ''}`}
                    onClick={() => setLevel(l.value)}
                  >
                    <Icon size={15} />
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="metrics-filter-row">
          <label className="metrics-field">
            <span className="metrics-field-label">Técnico de soporte</span>
            <select
              className="metrics-select"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">Todos los técnicos</option>
              {options.technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.active ? '' : ' (inactivo)'}
                </option>
              ))}
            </select>
          </label>

          <label className="metrics-field">
            <span className="metrics-field-label">Categoría del ticket</span>
            <select
              className="metrics-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.active ? '' : ' (inactiva)'}
                </option>
              ))}
            </select>
          </label>

          <div className="metrics-actions">
            <Button
              label="Restablecer filtros"
              severity="secondary"
              text
              size="small"
              disabled={!hasCustomFilters}
              onClick={clearFilters}
              icon={<IconFilterOff size={15} />}
            />
            <Button
              label="PDF"
              severity="danger"
              outlined
              size="small"
              disabled={!!rangeError || loading}
              loading={exportingFormat === 'pdf'}
              onClick={() => doExport('pdf')}
              icon={<IconFileTypePdf size={16} />}
            />
            <Button
              label="Excel"
              severity="success"
              outlined
              size="small"
              disabled={!!rangeError || loading}
              loading={exportingFormat === 'excel'}
              onClick={() => doExport('excel')}
              icon={<IconTable size={16} />}
            />
            <Button
              label="CSV"
              severity="info"
              outlined
              size="small"
              disabled={!!rangeError || loading}
              loading={exportingFormat === 'csv'}
              onClick={() => doExport('csv')}
              icon={<IconFileSpreadsheet size={16} />}
            />
          </div>
        </div>

        {(rangeError || error) && (
          <div className="metrics-alert">{rangeError || error}</div>
        )}
      </div>

      {/* Corte activo con chips rápidos */}
      <div className="metrics-scope-bar">
        <p className="metrics-scope">
          Corte actual: <b>{formatDate(dateFrom)} – {formatDate(dateTo)}</b> · {technicianName ?? 'Todos los técnicos'} · {categoryName ?? 'Todas las categorías'}
        </p>
        {(technicianName || categoryName) && (
          <div className="active-filter-chips">
            {technicianName && (
              <button
                type="button"
                className="active-chip"
                onClick={() => setTechnicianId('')}
              >
                Técnico: {technicianName} ✕
              </button>
            )}
            {categoryName && (
              <button
                type="button"
                className="active-chip"
                onClick={() => setCategoryId('')}
              >
                Categoría: {categoryName} ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPIs del rango */}
      <div className="kpi-row">
        {loading && !summary ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card skeleton-kpi">
              <Skeleton width="40%" height="28px" className="mb-2" />
              <Skeleton width="70%" height="14px" />
            </div>
          ))
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Tickets en el rango</span>
                <div className="kpi-icon-pill bg-blue"><IconTicket size={18} /></div>
              </div>
              <div className="kpi-value">{summary?.total_tickets ?? 0}</div>
              <div className="kpi-note">{summary?.tickets_sin_respuesta ?? 0} sin primera respuesta</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">FRT promedio</span>
                <div className="kpi-icon-pill bg-amber"><IconClockHour4 size={18} /></div>
              </div>
              <div className="kpi-value">{formatHours(summary?.frt_avg)}</div>
              <div className="kpi-note">
                Mín. {formatHours(summary?.frt_min)} · Máx. {formatHours(summary?.frt_max)}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">MTTR promedio</span>
                <div className="kpi-icon-pill bg-emerald"><IconHourglassHigh size={18} /></div>
              </div>
              <div className="kpi-value">{formatHours(summary?.mttr_avg)}</div>
              <div className="kpi-note">
                Mín. {formatHours(summary?.mttr_min)} · Máx. {formatHours(summary?.mttr_max)}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Tasa de resolución</span>
                <div className="kpi-icon-pill bg-purple"><IconCircleCheck size={18} /></div>
              </div>
              <div className="kpi-value">
                {summary?.tasa_resolucion != null ? `${summary.tasa_resolucion}%` : '—'}
              </div>
              <div className="kpi-note">{summary?.tickets_resueltos ?? 0} tickets resueltos</div>
            </div>
          </>
        )}
      </div>

      {/* Gráfico con Cross-filtering */}
      <div className="chart-card metrics-chart-card">
        <div className="chart-header">
          <div className="chart-title-block">
            <div className="chart-title-wrap">
              <IconChartLine size={18} className="text-blue" />
              <h3 className="chart-title">
                {levelInfo.value === 'general'
                  ? `¿Cómo evolucionaron FRT, MTTR y volumen ${report?.filters?.granularity === 'month' ? 'por mes' : 'por día'}?`
                  : levelInfo.value === 'technician'
                    ? '¿Cómo se compara el desempeño FRT y MTTR por técnico?'
                    : '¿Qué categorías demandan mayor tiempo de atención?'}
              </h3>
            </div>
            {activeLevel !== 'general' && rows.length > 0 && (
              <p className="chart-subtitle">
                Haz clic en cualquier barra para aplicar un filtro cruzado automático
              </p>
            )}
          </div>
        </div>
        <div className={`chart-body ${loading ? 'is-loading' : ''}`}>
          {!report ? (
            <Skeleton height="280px" />
          ) : rows.length === 0 ? (
            <div className="metrics-empty-box">
              <p>No hay datos para los filtros seleccionados.</p>
              {hasCustomFilters && (
                <Button
                  label="Restablecer filtros"
                  severity="secondary"
                  outlined
                  size="small"
                  icon={<IconFilterOff size={15} />}
                  onClick={clearFilters}
                />
              )}
            </div>
          ) : (
            <Chart type="bar" data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Tabla de detalle con Micro-barras integradas y clic para Drawer */}
      <div className={`metrics-table-wrap ${loading ? 'is-loading' : ''}`}>
        <table className="metrics-table">
          <thead>
            <tr>
              <th>{levelInfo.column}</th>
              <th className="num">Tickets</th>
              <th className="num">Con 1ª respuesta</th>
              <th className="num">Resueltos</th>
              <th className="num">FRT promedio</th>
              <th className="num">MTTR promedio</th>
              <th className="num">Tasa resolución</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="metrics-empty-cell">
                  {loading ? (
                    'Generando reporte…'
                  ) : (
                    <div className="metrics-empty-inline">
                      <span>No hay registros para los filtros seleccionados.</span>
                      {hasCustomFilters && (
                        <Button
                          label="Restablecer filtros"
                          severity="secondary"
                          outlined
                          size="small"
                          onClick={clearFilters}
                          icon={<IconFilterOff size={14} />}
                        />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const volPct = Math.round((Number(r.total_tickets || 0) / maxRowTickets) * 100)
                const rateVal = r.tasa_resolucion != null ? Number(r.tasa_resolucion) : null
                const isSelected = selectedRow?.key === r.key
                return (
                  <tr
                    key={r.key}
                    className={`metrics-clickable-row ${r.total_tickets === 0 ? 'is-empty' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedRow(r)}
                    title="Haz clic para ver el desglose detallado"
                  >
                    <td className="metrics-row-label">{r.label}</td>
                    <td className="num">
                      <div className="ux-micro-bar-cell">
                        <span>{r.total_tickets}</span>
                        <div className="ux-micro-bar-track">
                          <div
                            className="ux-micro-bar-fill tone-primary"
                            style={{ width: `${volPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="num">{r.tickets_respondidos}</td>
                    <td className="num">{r.tickets_resueltos}</td>
                    <td className="num">
                      <div className="metrics-time">{formatHours(r.frt_avg)}</div>
                      {r.frt_avg != null && (
                        <div className="metrics-range">{formatHours(r.frt_min)} – {formatHours(r.frt_max)}</div>
                      )}
                    </td>
                    <td className="num">
                      <div className="metrics-time">{formatHours(r.mttr_avg)}</div>
                      {r.mttr_avg != null && (
                        <div className="metrics-range">{formatHours(r.mttr_min)} – {formatHours(r.mttr_max)}</div>
                      )}
                    </td>
                    <td className="num">
                      <div className="ux-micro-bar-cell">
                        <span>{rateVal != null ? `${rateVal}%` : '—'}</span>
                        {rateVal != null && (
                          <div className="ux-micro-bar-track">
                            <div
                              className={`ux-micro-bar-fill ${getRateTone(rateVal)}`}
                              style={{ width: `${Math.min(100, rateVal)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación configurable */}
      {totalRows > 0 && (
        <div className="metrics-pagination-bar">
          <div className="metrics-pagination-info">
            Mostrando <b>{startIndex + 1}</b>–<b>{endIndex}</b> de <b>{totalRows}</b> registros
            {' · '}Página <b>{currentPage}</b> de <b>{totalPages}</b>
          </div>

          <div className="metrics-pagination-right">
            <label className="metrics-page-size">
              <span>Mostrar</span>
              <select
                className="metrics-page-select"
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="Registros por página"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>por página</span>
            </label>

            <div className="metrics-pagination-controls">
              <Button
                label="Anterior"
                severity="secondary"
                outlined
                size="small"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                icon={<IconChevronLeft size={16} />}
              />
              <Button
                label="Siguiente"
                severity="secondary"
                outlined
                size="small"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                icon={<IconChevronRight size={16} />}
                iconPos="right"
              />
            </div>
          </div>
        </div>
      )}

      <p className="metrics-footnote">
        <IconInfoCircle size={14} />
        <span>
          <strong>FRT</strong>: tiempo desde la creación del ticket hasta la primera respuesta del soporte.{' '}
          <strong>MTTR</strong>: tiempo desde la creación hasta la resolución. Haz clic en cualquier fila para inspeccionar su detalle en el panel lateral.
        </span>
      </p>

      {/* Drawer Lateral Deslizable para inspección de fila sin abandonar la vista */}
      <DetailDrawer
        open={Boolean(selectedRow)}
        title={selectedRow?.label || 'Detalle de Métricas'}
        subtitle={`${levelInfo.column} · ${formatDate(dateFrom)} – ${formatDate(dateTo)}`}
        onClose={() => setSelectedRow(null)}
        footer={
          <>
            <Button
              label="Cerrar"
              severity="secondary"
              outlined
              size="small"
              onClick={() => setSelectedRow(null)}
            />
            {activeLevel !== 'general' && selectedRow && (
              <Button
                label="Filtrar por este registro"
                size="small"
                icon={<IconFilter size={15} />}
                onClick={() => {
                  applyRowCrossFilter(selectedRow)
                  setSelectedRow(null)
                }}
              />
            )}
          </>
        }
      >
        {selectedRow && (
          <>
            <div className="ux-drawer-kpi-grid">
              <div className="ux-drawer-stat">
                <span className="ux-drawer-stat-label">Total tickets</span>
                <span className="ux-drawer-stat-value">{selectedRow.total_tickets}</span>
                <span className="ux-drawer-stat-sub">creados en el rango</span>
              </div>
              <div className="ux-drawer-stat">
                <span className="ux-drawer-stat-label">Resueltos</span>
                <span className="ux-drawer-stat-value">{selectedRow.tickets_resueltos}</span>
                <span className="ux-drawer-stat-sub">
                  {selectedRow.tickets_respondidos} con 1ª respuesta
                </span>
              </div>
            </div>

            <div className="ux-drawer-section">
              <h4 className="ux-drawer-section-title">Cumplimiento de Resolución</h4>
              <BulletChart
                label="Tasa de resolución"
                value={Number(selectedRow.tasa_resolucion ?? 0)}
                target={85}
                max={100}
                unit="%"
                helper={`${selectedRow.tickets_resueltos} de ${selectedRow.total_tickets} incidencias resueltas`}
              />
            </div>

            <div className="ux-drawer-section">
              <h4 className="ux-drawer-section-title">Tiempos de Atención</h4>
              <div className="ux-drawer-kpi-grid">
                <div className="ux-drawer-stat">
                  <span className="ux-drawer-stat-label">FRT promedio</span>
                  <span className="ux-drawer-stat-value">{formatHours(selectedRow.frt_avg)}</span>
                  <span className="ux-drawer-stat-sub">
                    Mín {formatHours(selectedRow.frt_min)} · Máx {formatHours(selectedRow.frt_max)}
                  </span>
                </div>
                <div className="ux-drawer-stat">
                  <span className="ux-drawer-stat-label">MTTR promedio</span>
                  <span className="ux-drawer-stat-value">{formatHours(selectedRow.mttr_avg)}</span>
                  <span className="ux-drawer-stat-sub">
                    Mín {formatHours(selectedRow.mttr_min)} · Máx {formatHours(selectedRow.mttr_max)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </DetailDrawer>
    </section>
  )
}
