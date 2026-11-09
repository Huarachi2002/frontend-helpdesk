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
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

/* Grid KPIs */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
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

.bg-blue { background: #e0f2fe; color: #0284c7; }
.bg-amber { background: #fef3c7; color: #d97706; }
.bg-emerald { background: #d1fae5; color: #059669; }
.bg-purple { background: #ede9fe; color: #7c3aed; }

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.kpi-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  margin-top: 4px;
}

.kpi-subtext {
  font-size: 11.5px;
  color: #94a3b8;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
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
  background: #f1f5f9;
  color: #0284c7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: #64748b;
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.action-card:hover {
  background: #ffffff;
  border-color: #38bdf8;
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

.icon-blue { background: #e0f2fe; color: #0284c7; }
.icon-purple { background: #ede9fe; color: #7c3aed; }
.icon-emerald { background: #d1fae5; color: #059669; }

.action-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.action-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.action-arrow {
  color: #94a3b8;
  transition: transform 0.2s, color 0.2s;
}

.action-card:hover .action-arrow {
  color: #0284c7;
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
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
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
  background: #ecfdf5;
  color: #10b981;
}

.health-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.health-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.health-sub {
  font-size: 11.5px;
  color: #64748b;
}

/* Bot summary card */
.bot-summary-card {
  padding: 16px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
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
  color: #475569;
}

.bot-stat-val {
  font-size: 14px;
  font-weight: 700;
  color: #f59e0b;
}

.bot-summary-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.bot-progress {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bot-hint {
  font-size: 11.5px;
  color: #64748b;
  display: block;
  line-height: 1.4;
}
</style>
