<template>
  <div class="reports-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-titles">
        <h1 class="page-title">Métricas y Reportes Analíticos</h1>
        <p class="page-subtitle">
          Visualización de rendimiento del servicio, categorización de incidencias y descargas en formatos ejecutivos
        </p>
      </div>
    </div>

    <!-- Skeletons durante carga -->
    <div v-if="loadingCharts" class="kpi-row">
      <div v-for="i in 5" :key="i" class="kpi-card skeleton-kpi">
        <Skeleton width="40%" height="28px" class="mb-2" />
        <Skeleton width="70%" height="14px" />
      </div>
    </div>

    <!-- KPIs Rápidos -->
    <div v-else class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-label">Total Tickets</span>
          <div class="kpi-icon-pill bg-blue">
            <IconTicket :size="18" />
          </div>
        </div>
        <div class="kpi-value">{{ volume.total_tickets ?? '—' }}</div>
        <div class="kpi-note">Historial acumulado</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-label">FRT Promedio</span>
          <div class="kpi-icon-pill bg-amber">
            <IconClockHour4 :size="18" />
          </div>
        </div>
        <div class="kpi-value">
          {{ times.frt_hours_average != null ? times.frt_hours_average + 'h' : '—' }}
        </div>
        <div class="kpi-note">Primera respuesta</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-label">MTTR Promedio</span>
          <div class="kpi-icon-pill bg-emerald">
            <IconHourglassHigh :size="18" />
          </div>
        </div>
        <div class="kpi-value">
          {{ times.mttr_hours?.average != null ? times.mttr_hours.average + 'h' : '—' }}
        </div>
        <div class="kpi-note">Resolución definitiva</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-label">Tasa Bot Autónomo</span>
          <div class="kpi-icon-pill bg-purple">
            <IconRobot :size="18" />
          </div>
        </div>
        <div class="kpi-value">
          {{ impact.bot_autonomous_resolution_rate_percent != null ? impact.bot_autonomous_resolution_rate_percent + '%' : '—' }}
        </div>
        <div class="kpi-note">Sin intervención técnica</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-header">
          <span class="kpi-label">Tasa Escalado</span>
          <div class="kpi-icon-pill bg-rose">
            <IconSparkles :size="18" />
          </div>
        </div>
        <div class="kpi-value">
          {{ impact.escalation_to_human_rate_percent != null ? impact.escalation_to_human_rate_percent + '%' : '—' }}
        </div>
        <div class="kpi-note">Atendidos por agentes</div>
      </div>
    </div>

    <!-- Gráficos -->
    <div class="charts-grid">
      <!-- Volumen por período -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <IconChartBar :size="18" class="text-blue" />
            <h3 class="chart-title">Volumen de Tickets por Período</h3>
          </div>
        </div>
        <div class="chart-body">
          <Skeleton v-if="loadingCharts" height="260px" />
          <Bar v-else :data="volumeChartData" :options="barOptions" />
        </div>
      </div>

      <!-- Distribución por categoría -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <IconChartBar :size="18" class="text-purple" />
            <h3 class="chart-title">Distribución por Categoría</h3>
          </div>
        </div>
        <div class="chart-body doughnut-wrap">
          <Skeleton v-if="loadingCharts" height="260px" />
          <Doughnut v-else :data="categoryChartData" :options="doughnutOptions" />
        </div>
      </div>

      <!-- Bot vs Humano -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <IconRobot :size="18" class="text-emerald" />
            <h3 class="chart-title">Impacto: Bot Autónomo vs Humano</h3>
          </div>
        </div>
        <div class="chart-body">
          <Skeleton v-if="loadingCharts" height="260px" />
          <Bar v-else :data="impactChartData" :options="barOptions" />
        </div>
      </div>
    </div>

    <!-- Panel de Exportación -->
    <div class="export-panel">
      <div class="export-header">
        <div class="export-title-wrap">
          <IconDownload :size="20" class="text-blue" />
          <div>
            <h3 class="export-title">Exportar Datos y Reportes Ejecutivos</h3>
            <p class="export-subtitle">Selecciona el rango de fechas y descarga los datos consolidados</p>
          </div>
        </div>
      </div>

      <div class="export-row">
        <div class="export-dates">
          <div class="date-field">
            <label class="date-label">Desde:</label>
            <div class="date-input-wrap">
              <IconCalendar :size="16" class="calendar-icon" />
              <input v-model="exportFrom" type="date" class="date-input" />
            </div>
          </div>

          <div class="date-field">
            <label class="date-label">Hasta:</label>
            <div class="date-input-wrap">
              <IconCalendar :size="16" class="calendar-icon" />
              <input v-model="exportTo" type="date" class="date-input" />
            </div>
          </div>
        </div>

        <div class="export-buttons-group">
          <Button
            label="Descargar CSV"
            severity="info"
            outlined
            size="small"
            :loading="exportingFormat === 'csv'"
            @click="doExport('csv')"
          >
            <template #icon>
              <IconFileSpreadsheet :size="16" class="p-button-icon-left" />
            </template>
          </Button>

          <Button
            label="Descargar Excel"
            severity="success"
            outlined
            size="small"
            :loading="exportingFormat === 'excel'"
            @click="doExport('excel')"
          >
            <template #icon>
              <IconTable :size="16" class="p-button-icon-left" />
            </template>
          </Button>

          <Button
            label="Descargar PDF"
            severity="danger"
            outlined
            size="small"
            :loading="exportingFormat === 'pdf'"
            @click="doExport('pdf')"
          >
            <template #icon>
              <IconFileTypePdf :size="16" class="p-button-icon-left" />
            </template>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useToast } from 'primevue/usetoast'
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
} from '@tabler/icons-vue'
import { getVolumeReport, getImpactReport, getTimesReport, exportReport } from '../../api/reports.js'
import { chartColors } from '../../styles/theme.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const toast = useToast()

const volume        = ref({})
const impact        = ref({})
const times         = ref({})
const loadingCharts = ref(true)

const exportFrom      = ref('')
const exportTo        = ref('')
const exportingFormat = ref(null)

onMounted(async () => {
  try {
    const [v, i, t] = await Promise.all([
      getVolumeReport(),
      getImpactReport(),
      getTimesReport(),
    ])
    volume.value = v.data
    impact.value = i.data
    times.value  = t.data
  } catch (err) {
    console.error('Error al cargar reportes', err)
  } finally {
    loadingCharts.value = false
  }
})

// Gráfico Volumen por período (referencia a la paleta centralizada)
const volumeChartData = computed(() => ({
  labels: (volume.value.by_period ?? []).map(p => p.month),
  datasets: [{
    label: 'Tickets',
    data: (volume.value.by_period ?? []).map(p => p.count),
    backgroundColor: chartColors.blue,
    hoverBackgroundColor: chartColors.palette[0],
    borderRadius: 8,
  }],
}))

// Gráfico por categoría (referencia a la paleta centralizada)
const categoryChartData = computed(() => ({
  labels: (volume.value.by_category ?? []).map(c => c.name),
  datasets: [{
    data: (volume.value.by_category ?? []).map(c => c.count),
    backgroundColor: chartColors.palette,
    borderWidth: 0,
  }],
}))

// Gráfico Bot vs Humano (referencia a la paleta centralizada)
const impactChartData = computed(() => ({
  labels: ['Resueltos por Bot', 'Escalados a Humano'],
  datasets: [{
    label: 'Porcentaje (%)',
    data: [
      impact.value.bot_autonomous_resolution_rate_percent ?? 0,
      impact.value.escalation_to_human_rate_percent ?? 0,
    ],
    backgroundColor: [chartColors.emerald, chartColors.amber],
    borderRadius: 8,
  }],
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: { color: '#64748b' },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#64748b' },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        color: '#475569',
        font: { size: 12 },
      },
    },
  },
}

async function doExport(format) {
  exportingFormat.value = format
  try {
    const params = {}
    if (exportFrom.value) params.from = exportFrom.value
    if (exportTo.value)   params.to   = exportTo.value

    const { data } = await exportReport(format, params)
    const ext = format === 'excel' ? 'xlsx' : format
    const url = URL.createObjectURL(new Blob([data]))
    const a   = document.createElement('a')
    a.href = url
    a.download = `reporte_helpdesk_${new Date().toISOString().slice(0,10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'Reporte Generado',
      detail: `El archivo ${format.toUpperCase()} se descargó exitosamente.`,
      life: 3500,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error en Descarga',
      detail: 'No fue posible exportar el reporte seleccionado.',
      life: 4000,
    })
  } finally {
    exportingFormat.value = null
  }
}
</script>

<style scoped>
.reports-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.5px;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* KPI Row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kpi-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-icon-pill {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-blue    { background: var(--kpi-tickets-bg);  color: var(--kpi-tickets-icon); }
.bg-amber   { background: var(--kpi-frt-bg);      color: var(--kpi-frt-icon); }
.bg-emerald { background: var(--kpi-mttr-bg);     color: var(--kpi-mttr-icon); }
.bg-purple  { background: var(--kpi-bot-bg);      color: var(--kpi-bot-icon); }
.bg-rose    { background: var(--kpi-escalate-bg); color: var(--kpi-escalate-icon); }

.kpi-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.kpi-note {
  font-size: 11.5px;
  color: var(--text-subtle);
  margin-top: 4px;
}

.skeleton-kpi {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
}

.mb-2 { margin-bottom: 8px; }

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.chart-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.chart-body {
  height: 260px;
  position: relative;
}

.doughnut-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-blue    { color: var(--color-primary-600); }
.text-purple  { color: var(--color-purple-600); }
.text-emerald { color: var(--color-success-600); }

/* Export Panel */
.export-panel {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.export-header {
  margin-bottom: 18px;
}

.export-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.export-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.export-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.export-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.export-dates {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-slate-600);
}

.date-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.calendar-icon {
  position: absolute;
  left: 10px;
  color: var(--text-subtle);
  pointer-events: none;
}

.date-input {
  padding: 8px 12px 8px 34px;
  background: var(--surface-input);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--text-main);
  outline: none;
  transition: border-color 0.15s;
}

.date-input:focus {
  border-color: var(--border-focus);
  background: var(--surface-input-focus);
}

.export-buttons-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.p-button-icon-left {
  margin-right: 6px;
}
</style>
