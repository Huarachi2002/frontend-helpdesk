<template>
  <div class="dashboard-page">
    <!-- Encabezado -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Panel de Control Helpdesk</h1>
        <p class="page-subtitle">Resumen operativo de incidencias del campus y rendimiento del Bot de IA</p>
      </div>

      <div class="header-actions">
        <Button
          label="Actualizar datos"
          severity="secondary"
          outlined
          size="small"
          :loading="loading"
          @click="fetchData"
        >
          <template #icon>
            <IconRefresh :size="16" class="p-button-icon-left" />
          </template>
        </Button>
      </div>
    </div>

    <!-- Skeletons durante carga -->
    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 4" :key="i" class="kpi-card skeleton-card">
        <Skeleton shape="circle" size="48px" />
        <div class="skeleton-text">
          <Skeleton width="60%" height="28px" class="mb-2" />
          <Skeleton width="90%" height="16px" />
        </div>
      </div>
    </div>

    <!-- Grid de KPIs principales -->
    <div v-else class="kpi-grid">
      <!-- Total Tickets -->
      <div class="kpi-card card-tickets">
        <div class="kpi-icon-wrap bg-blue">
          <IconTicket :size="26" stroke-width="2" />
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ volume.total_tickets ?? 0 }}</div>
          <div class="kpi-label">Total de Tickets Registrados</div>
          <div class="kpi-subtext">Plataforma educativa</div>
        </div>
      </div>

      <!-- FRT Promedio -->
      <div class="kpi-card card-frt">
        <div class="kpi-icon-wrap bg-amber">
          <IconClockHour4 :size="26" stroke-width="2" />
        </div>
        <div class="kpi-content">
          <div class="kpi-value">
            {{ times.frt_hours_average != null ? times.frt_hours_average + 'h' : '—' }}
          </div>
          <div class="kpi-label">Tiempo 1ª Respuesta (FRT)</div>
          <div class="kpi-subtext">Promedio general</div>
        </div>
      </div>

      <!-- MTTR Promedio -->
      <div class="kpi-card card-mttr">
        <div class="kpi-icon-wrap bg-emerald">
          <IconHourglassHigh :size="26" stroke-width="2" />
        </div>
        <div class="kpi-content">
          <div class="kpi-value">
            {{ times.mttr_hours?.average != null ? times.mttr_hours.average + 'h' : '—' }}
          </div>
          <div class="kpi-label">Tiempo Resolución (MTTR)</div>
          <div class="kpi-subtext">Horas promedio</div>
        </div>
      </div>

      <!-- Resolución Bot -->
      <div class="kpi-card card-bot">
        <div class="kpi-icon-wrap bg-purple">
          <IconRobot :size="26" stroke-width="2" />
        </div>
        <div class="kpi-content">
          <div class="kpi-value">
            {{ impact.bot_autonomous_resolution_rate_percent != null ? impact.bot_autonomous_resolution_rate_percent + '%' : '—' }}
          </div>
          <div class="kpi-label">Resolución Autónoma Bot</div>
          <div class="kpi-subtext">Efectividad directa</div>
        </div>
      </div>
    </div>

    <!-- Sección de accesos directos y estado operativo -->
    <div class="dashboard-sections">
      <!-- Acciones Rápidas -->
      <div class="section-card actions-box">
        <div class="section-header">
          <div class="section-icon">
            <IconSparkles :size="20" />
          </div>
          <h2 class="section-title">Accesos Rápidos</h2>
        </div>

        <p class="section-desc">Accede directamente a los módulos operacionales del sistema:</p>

        <div class="actions-grid">
          <RouterLink to="/tickets" class="action-card">
            <div class="action-card-icon icon-blue">
              <IconTicket :size="24" />
            </div>
            <div class="action-card-info">
              <span class="action-title">Bandeja de Tickets</span>
              <span class="action-desc">Gestiona incidencias de alumnos y profesores</span>
            </div>
            <IconArrowRight :size="18" class="action-arrow" />
          </RouterLink>

          <RouterLink to="/bot-history" class="action-card">
            <div class="action-card-icon icon-purple">
              <IconRobot :size="24" />
            </div>
            <div class="action-card-info">
              <span class="action-title">Historial del Bot IA</span>
              <span class="action-desc">Monitorea consultas, respuestas e intenciones</span>
            </div>
            <IconArrowRight :size="18" class="action-arrow" />
          </RouterLink>

          <RouterLink to="/reports" class="action-card">
            <div class="action-card-icon icon-emerald">
              <IconChartBar :size="24" />
            </div>
            <div class="action-card-info">
              <span class="action-title">Reportes & Estadísticas</span>
              <span class="action-desc">Gráficas de volumen, categorías y exportaciones</span>
            </div>
            <IconArrowRight :size="18" class="action-arrow" />
          </RouterLink>
        </div>
      </div>

      <!-- Resumen Operativo & Salud del Sistema -->
      <div class="section-card status-box">
        <div class="section-header">
          <div class="section-icon">
            <IconActivity :size="20" />
          </div>
          <h2 class="section-title">Salud del Entorno Helpdesk</h2>
        </div>

        <div class="health-list">
          <div class="health-item">
            <div class="health-status-icon success">
              <IconCircleCheck :size="18" />
            </div>
            <div class="health-info">
              <span class="health-name">Servicio Moodle Webhooks</span>
              <span class="health-sub">Escuchando eventos de tickets y cursos</span>
            </div>
            <Tag value="Operativo" severity="success" rounded />
          </div>

          <div class="health-item">
            <div class="health-status-icon success">
              <IconCircleCheck :size="18" />
            </div>
            <div class="health-info">
              <span class="health-name">Motor de IA NLP / Bot</span>
              <span class="health-sub">Modelo de clasificación de intenciones</span>
            </div>
            <Tag value="Activo" severity="success" rounded />
          </div>

          <div class="health-item">
            <div class="health-status-icon success">
              <IconCircleCheck :size="18" />
            </div>
            <div class="health-info">
              <span class="health-name">Base de Datos PostgreSQL</span>
              <span class="health-sub">Auditoría y tiempos de resolución OK</span>
            </div>
            <Tag value="Conectado" severity="info" rounded />
          </div>
        </div>

        <div class="bot-summary-card">
          <div class="bot-summary-stat">
            <span class="bot-stat-title">Tasa de Escalado a Humano</span>
            <span class="bot-stat-val">{{ impact.escalation_to_human_rate_percent != null ? impact.escalation_to_human_rate_percent + '%' : '—' }}</span>
          </div>
          <div class="bot-summary-bar">
            <div
              class="bot-progress"
              :style="{ width: (impact.escalation_to_human_rate_percent || 0) + '%' }"
            />
          </div>
          <span class="bot-hint">El restante {{ impact.bot_autonomous_resolution_rate_percent || 0 }}% es resuelto sin requerir intervención humana.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
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
} from '@tabler/icons-vue'
import { getVolumeReport, getImpactReport, getTimesReport } from '../../api/reports.js'

const loading = ref(true)
const volume  = ref({})
const impact  = ref({})
const times   = ref({})

async function fetchData() {
  loading.value = true
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
    console.error('Error al cargar datos del dashboard', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
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

/* Grid KPIs */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.kpi-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07);
}

.kpi-icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-blue    { background: var(--kpi-tickets-bg); color: var(--kpi-tickets-icon); }
.bg-amber   { background: var(--kpi-frt-bg);     color: var(--kpi-frt-icon); }
.bg-emerald { background: var(--kpi-mttr-bg);    color: var(--kpi-mttr-icon); }
.bg-purple  { background: var(--kpi-bot-bg);     color: var(--kpi-bot-icon); }

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.kpi-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-body);
  margin-top: 4px;
}

.kpi-subtext {
  font-size: 11.5px;
  color: var(--text-subtle);
  margin-top: 2px;
}

/* Skeleton loader */
.skeleton-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skeleton-text {
  flex: 1;
}

.mb-2 {
  margin-bottom: 8px;
}

/* Layout de Secciones */
.dashboard-sections {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .dashboard-sections {
    grid-template-columns: 1fr;
  }
}

.section-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 18px;
}

/* Actions Grid */
.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--surface-card-hover);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.action-card:hover {
  background: var(--surface-card);
  border-color: var(--color-primary-400);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
}

.action-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-blue    { background: var(--color-primary-100); color: var(--color-primary-600); }
.icon-purple  { background: var(--color-purple-100);  color: var(--color-purple-600); }
.icon-emerald { background: var(--color-success-100); color: var(--color-success-600); }

.action-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.action-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.action-arrow {
  color: var(--text-subtle);
  transition: transform 0.2s, color 0.2s;
}

.action-card:hover .action-arrow {
  color: var(--color-primary-600);
  transform: translateX(3px);
}

/* Health status list */
.health-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.health-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface-app);
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.health-status-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.health-status-icon.success {
  background: var(--color-success-50);
  color: var(--color-success-500);
}

.health-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.health-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-body);
}

.health-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

/* Bot summary card */
.bot-summary-card {
  padding: 16px;
  background: var(--surface-app);
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
}

.bot-summary-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.bot-stat-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-slate-600);
}

.bot-stat-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-warning-500);
}

.bot-summary-bar {
  width: 100%;
  height: 8px;
  background: var(--border-default);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.bot-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--color-warning-500), var(--color-danger-500));
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bot-hint {
  font-size: 11.5px;
  color: var(--text-muted);
  display: block;
  line-height: 1.4;
}
</style>
