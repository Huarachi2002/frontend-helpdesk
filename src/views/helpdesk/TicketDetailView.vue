<template>
  <div class="ticket-detail-view">
    <!-- Navegación superior -->
    <div class="detail-header">
      <div class="header-left">
        <RouterLink to="/tickets" class="back-button">
          <IconArrowLeft :size="18" />
          <span>Volver a la bandeja</span>
        </RouterLink>

        <div v-if="store.ticket" class="ticket-header-title">
          <span class="ticket-id-badge">#{{ store.ticket.id }}</span>
          <h1 class="ticket-main-title">{{ store.ticket.title }}</h1>
        </div>
      </div>

      <div v-if="store.ticket" class="header-badges">
        <Tag
          :value="statusLabel(store.ticket.status)"
          :severity="statusSeverity(store.ticket.status)"
          rounded
        />
        <Tag
          :value="priorityLabel(store.ticket.priority)"
          :severity="prioritySeverity(store.ticket.priority)"
          rounded
        />
      </div>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="store.loading" class="detail-layout">
      <div class="main-column">
        <div class="surface-card">
          <Skeleton width="40%" height="28px" class="mb-3" />
          <Skeleton width="100%" height="16px" class="mb-2" />
          <Skeleton width="90%" height="16px" class="mb-2" />
          <Skeleton width="75%" height="16px" />
        </div>
        <div class="surface-card">
          <Skeleton width="30%" height="24px" class="mb-3" />
          <Skeleton width="100%" height="80px" />
        </div>
      </div>
      <div class="sidebar-column">
        <div class="surface-card">
          <Skeleton width="60%" height="24px" class="mb-3" />
          <Skeleton width="100%" height="40px" class="mb-2" />
          <Skeleton width="100%" height="40px" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="store.error" class="error-box">
      <IconAlertCircle :size="36" class="error-icon" />
      <h3>No se pudo cargar la información del ticket</h3>
      <p>{{ store.error }}</p>
      <RouterLink to="/tickets">
        <Button label="Regresar a tickets" severity="secondary" size="small" />
      </RouterLink>
    </div>

    <!-- Contenido del Ticket -->
    <div v-else-if="store.ticket" class="detail-layout">
      <!-- Columna Principal -->
      <div class="main-column">
        <!-- Descripción y Datos Básicos -->
        <div class="surface-card">
          <div class="card-section-header">
            <span class="section-label">DESCRIPCIÓN DE LA INCIDENCIA</span>
          </div>

          <div class="ticket-description">
            {{ store.ticket.description || 'Sin descripción detallada proporcionada.' }}
          </div>

          <div class="meta-chips-grid">
            <div class="meta-chip">
              <IconFolder :size="16" class="chip-icon text-blue" />
              <div class="chip-content">
                <span class="chip-title">Categoría</span>
                <span class="chip-value">{{ store.ticket.category?.name ?? 'Sin categoría' }}</span>
              </div>
            </div>

            <div class="meta-chip">
              <IconCalendar :size="16" class="chip-icon text-slate" />
              <div class="chip-content">
                <span class="chip-title">Fecha de Creación</span>
                <span class="chip-value">{{ formatDate(store.ticket.times?.created_at) }}</span>
              </div>
            </div>

            <div class="meta-chip">
              <IconCircleCheck :size="16" class="chip-icon text-emerald" />
              <div class="chip-content">
                <span class="chip-title">Fecha de Resolución</span>
                <span class="chip-value">{{ formatDate(store.ticket.times?.resolved_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Información Académica / Moodle -->
        <div class="surface-card">
          <div class="card-section-header">
            <IconSchool :size="18" class="text-blue" />
            <h3 class="section-heading">Datos Académicos del Campus (Moodle)</h3>
          </div>

          <div class="moodle-grid">
            <div class="moodle-item">
              <span class="moodle-label">ID Usuario Moodle:</span>
              <span class="moodle-val font-mono">{{ store.ticket.moodle_data?.user_id ?? '—' }}</span>
            </div>

            <div class="moodle-item">
              <span class="moodle-label">Curso Asociado:</span>
              <span class="moodle-val">{{ store.ticket.moodle_data?.course ?? 'Sin curso especificado' }}</span>
            </div>

            <div class="moodle-item">
              <span class="moodle-label">Rol en Plataforma:</span>
              <span class="moodle-val highlight-role">{{ store.ticket.moodle_data?.role ?? 'Estudiante' }}</span>
            </div>
          </div>
        </div>

        <!-- Historial y Conversación (Timeline) -->
        <div class="surface-card">
          <div class="card-section-header">
            <IconHistory :size="18" class="text-slate" />
            <h3 class="section-heading">Hilo de Conversación y Auditoría</h3>
          </div>

          <div v-if="!store.ticket.history || store.ticket.history.length === 0" class="timeline-empty">
            <IconHistory :size="24" class="text-muted" />
            <span>No se han registrado interacciones o transiciones todavía.</span>
          </div>

          <div v-else class="timeline-list">
            <div
              v-for="(h, idx) in store.ticket.history"
              :key="idx"
              class="timeline-row"
            >
              <div class="timeline-marker">
                <div class="marker-dot" :class="h.changer_role"></div>
                <div v-if="idx < store.ticket.history.length - 1" class="marker-line"></div>
              </div>

              <div class="timeline-body">
                <div class="timeline-header-meta">
                  <div class="timeline-user">
                    <IconUserCheck :size="15" />
                    <b>{{ h.changed_by ?? 'Sistema Helpdesk' }}</b>
                    <span v-if="h.changer_role" :class="['role-badge', 'role-' + h.changer_role]">
                      {{ roleLabel(h.changer_role) }}
                    </span>
                  </div>
                  <span class="timeline-time">{{ formatDate(h.changed_at) }}</span>
                </div>

                <div class="timeline-transition">
                  <template v-if="h.old_status && h.old_status !== h.new_status">
                    <span class="status-from">
                      {{ statusLabel(h.old_status) }}
                    </span>
                    <span class="status-arrow">→</span>
                    <span class="status-to">
                      {{ statusLabel(h.new_status) }}
                    </span>
                  </template>
                  <template v-else-if="h.old_status && h.old_status === h.new_status">
                    <span class="status-same">
                      Mensaje en <strong>{{ statusLabel(h.new_status) }}</strong>
                    </span>
                  </template>
                  <template v-else>
                    <span class="status-to">
                      Apertura de Ticket ({{ statusLabel(h.new_status) }})
                    </span>
                  </template>
                </div>

                <div v-if="h.comments" class="timeline-comment-box" :class="'box-' + (h.changer_role || 'system')">
                  <IconMessageDots :size="15" class="comment-icon" />
                  <span class="comment-text">{{ h.comments }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Lateral (Sidebar de Acciones) -->
      <div class="sidebar-column">
        <!-- Panel para Cambiar Estado -->
        <div class="surface-card action-panel">
          <div class="card-section-header">
            <h3 class="section-heading">Actualizar Estado</h3>
          </div>

          <!-- Estado actual -->
          <div class="current-status-row">
            <span class="current-status-label">Estado actual:</span>
            <Tag
              :value="statusLabel(store.ticket.status)"
              :severity="statusSeverity(store.ticket.status)"
              rounded
            />
          </div>

          <!-- Estado final — sin transiciones posibles -->
          <div v-if="allowedTransitions.length === 0" class="final-state-notice">
            <IconLock :size="16" class="final-state-icon" />
            <span>Este ticket está en un estado final (<strong>{{ statusLabel(store.ticket.status) }}</strong>) y no admite más cambios.</span>
          </div>

          <!-- Selector dinámico — solo muestra las transiciones permitidas por el State Pattern -->
          <template v-else>
            <div class="form-group">
              <label class="form-label">Nuevo estado:</label>
              <select v-model="newStatus" class="select-field">
                <option disabled value="">— Seleccionar destino —</option>
                <option
                  v-for="key in allowedTransitions"
                  :key="key"
                  :value="key"
                >
                  {{ statusLabel(key) }}
                </option>
              </select>
              <p class="allowed-hint">
                <IconInfoCircle :size="13" />
                Solo se muestran los estados válidos desde <em>{{ statusLabel(store.ticket.status) }}</em>.
              </p>
            </div>

            <div class="form-group">
              <label class="form-label">Comentario o motivo:</label>
              <textarea
                v-model="statusComment"
                class="textarea-field"
                rows="3"
                placeholder="Ej. Se reestableció el acceso al aula virtual..."
              />
            </div>

            <Button
              label="Guardar Estado"
              severity="primary"
              class="w-full"
              :loading="actionLoading"
              :disabled="!newStatus"
              @click="handleStatusChange"
            >
              <template #icon>
                <IconDeviceFloppy :size="16" class="p-button-icon-left" />
              </template>
            </Button>
          </template>
        </div>

        <!-- Agente Asignado -->
        <div class="surface-card">
          <div class="card-section-header">
            <IconUser :size="17" class="text-blue" />
            <h3 class="section-heading">Técnico Asignado</h3>
          </div>

          <div v-if="store.ticket.assigned_to" class="assigned-profile">
            <div class="profile-avatar">
              {{ store.ticket.assigned_to.name?.charAt(0).toUpperCase() }}
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ store.ticket.assigned_to.name }}</div>
              <div class="profile-email">
                <IconMail :size="13" />
                <span>{{ store.ticket.assigned_to.email }}</span>
              </div>
            </div>
          </div>
          <div v-else class="unassigned-profile">
            <span>Ticket pendiente de asignación técnica</span>
          </div>
        </div>

        <!-- Métricas SLA & Tiempos -->
        <div class="surface-card">
          <div class="card-section-header">
            <IconClock :size="17" class="text-amber" />
            <h3 class="section-heading">Tiempos de Atención</h3>
          </div>

          <div class="sla-list">
            <div class="sla-row">
              <span class="sla-label">1ª Respuesta:</span>
              <span class="sla-val">{{ formatDate(store.ticket.times?.first_response_at) }}</span>
            </div>
            <div class="sla-row">
              <span class="sla-label">Resolución:</span>
              <span class="sla-val">{{ formatDate(store.ticket.times?.resolved_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import {
  IconArrowLeft,
  IconFolder,
  IconCalendar,
  IconCircleCheck,
  IconSchool,
  IconHistory,
  IconUserCheck,
  IconMessageDots,
  IconDeviceFloppy,
  IconUser,
  IconMail,
  IconClock,
  IconAlertCircle,
  IconLock,
  IconInfoCircle,
} from '@tabler/icons-vue'
import { useTicketsStore } from '../../stores/tickets.js'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const store = useTicketsStore()
const toast = useToast()

const newStatus     = ref('')
const statusComment = ref('')
const actionLoading = ref(false)

// Transiciones permitidas desde el estado actual (vienen del TicketResource via State Pattern)
const allowedTransitions = computed(() => store.ticket?.allowed_transitions ?? [])

onMounted(async () => {
  await store.fetchTicket(props.id)
  // Pre-seleccionar la primera transición disponible (si existe)
  newStatus.value = allowedTransitions.value[0] ?? ''
})

async function handleStatusChange() {
  if (!newStatus.value) return
  actionLoading.value = true

  try {
    await store.changeStatus(props.id, newStatus.value, statusComment.value)
    // Actualizar la pre-selección al nuevo primer destino disponible
    newStatus.value = allowedTransitions.value[0] ?? ''
    statusComment.value = ''
    toast.add({
      severity: 'success',
      summary: 'Estado Actualizado',
      detail: `El ticket ahora está en estado "${statusLabel(store.ticket.status)}"`,
      life: 3500,
    })
  } catch (e) {
    // e es el error enriquecido que lanza el store con la info del State Pattern
    if (e.errorCode === 'invalid_state_transition') {
      // Mensaje específico del patrón States
      const allowed = e.allowedTransitions?.length
        ? e.allowedTransitions.map(statusLabel).join(', ')
        : 'ninguno (estado final)'

      toast.add({
        severity: 'error',
        summary: 'Transición No Permitida',
        detail: `No se puede cambiar de "${statusLabel(e.currentStatus)}" a "${statusLabel(e.targetStatus)}". Transiciones válidas: ${allowed}.`,
        life: 6000,
      })
    } else {
      // Error genérico (422 validación, 500, etc.)
      toast.add({
        severity: 'error',
        summary: 'Error al Actualizar',
        detail: e.message || 'No se pudo actualizar el estado del ticket.',
        life: 4500,
      })
    }
  } finally {
    actionLoading.value = false
  }
}

function roleLabel(r) {
  const map = {
    admin: 'Administrador',
    support: 'Soporte Técnico',
    estudiante: 'Estudiante',
    student: 'Estudiante',
    teacher: 'Docente',
  }
  return map[r] ?? r
}

function statusLabel(s) {
  const map = {
    open: 'Abierto',
    in_progress: 'En Proceso',
    waiting: 'Esperando',
    resolved: 'Resuelto',
    closed: 'Cerrado',
  }
  return map[s] ?? s
}

function statusSeverity(s) {
  switch (s) {
    case 'open': return 'info'
    case 'in_progress': return 'warn'
    case 'waiting': return 'contrast'
    case 'resolved': return 'success'
    case 'closed': return 'secondary'
    default: return 'info'
  }
}

function priorityLabel(p) {
  const map = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
  }
  return map[p] ?? p
}

function prioritySeverity(p) {
  switch (p) {
    case 'low': return 'success'
    case 'medium': return 'warn'
    case 'high': return 'danger'
    case 'critical': return 'danger'
    default: return 'secondary'
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.ticket-detail-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s;
}

.back-button:hover {
  color: var(--color-primary-600);
}

.ticket-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ticket-id-badge {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  font-size: 15px;
  padding: 4px 10px;
  border-radius: 8px;
}

.ticket-main-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.4px;
  margin: 0;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Layout Columns */
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

.main-column, .sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Cards */
.surface-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.6px;
}

.section-heading {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.ticket-description {
  font-size: 14.5px;
  color: var(--text-body);
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 20px;
  background: var(--surface-app);
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}

.meta-chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  padding: 10px 14px;
  border-radius: 10px;
}

.chip-icon {
  flex-shrink: 0;
}

.text-blue    { color: var(--color-primary-600); }
.text-slate   { color: var(--text-muted); }
.text-emerald { color: var(--color-success-600); }
.text-amber   { color: var(--color-warning-600); }
.text-muted   { color: var(--text-subtle); }

.chip-content {
  display: flex;
  flex-direction: column;
}

.chip-title {
  font-size: 11px;
  color: var(--text-muted);
}

.chip-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

/* Moodle Data */
.moodle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.moodle-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--surface-app);
  border-radius: 8px;
}

.moodle-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.moodle-val {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-slate-800);
}

.font-mono {
  font-family: var(--font-mono, monospace);
}

.highlight-role {
  color: var(--color-primary-600);
}

/* Timeline */
.timeline-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-subtle);
  font-size: 13px;
  padding: 16px 0;
}

.timeline-list {
  display: flex;
  flex-direction: column;
}

.timeline-row {
  display: flex;
  gap: 16px;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
}

.marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary-600);
  border: 2px solid var(--color-primary-200);
  margin-top: 4px;
}

.marker-line {
  flex: 1;
  width: 2px;
  background: var(--border-default);
  margin: 4px 0;
}

.timeline-body {
  flex: 1;
  padding-bottom: 20px;
}

.timeline-header-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.timeline-user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  flex-wrap: wrap;
}

.role-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.role-admin {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.role-support {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.role-estudiante, .role-student {
  background: var(--surface-muted);
  color: var(--color-slate-600);
}

.role-teacher {
  background: var(--color-purple-100);
  color: var(--color-purple-700);
}

.timeline-time {
  font-size: 12px;
  color: var(--text-subtle);
}

.timeline-transition {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  margin-bottom: 6px;
}

.status-from {
  color: var(--text-muted);
}

.status-arrow {
  color: var(--color-slate-300);
}

.status-to {
  font-weight: 700;
  color: var(--text-main);
}

.status-same {
  color: var(--text-muted);
  font-size: 12px;
}

.marker-dot.support {
  background: var(--color-primary-600);
  border-color: var(--color-primary-200);
}

.marker-dot.admin {
  background: var(--color-warning-500);
  border-color: var(--color-warning-200);
}

.marker-dot.estudiante, .marker-dot.student {
  background: var(--color-slate-500);
  border-color: var(--color-slate-300);
}

.timeline-comment-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--surface-app);
  border-left: 3px solid var(--border-strong);
  padding: 12px 14px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: var(--text-body);
  line-height: 1.5;
  margin: 4px 0 0;
}

.timeline-comment-box.box-support {
  background: var(--color-primary-50);
  border-left-color: var(--color-primary-600);
}

.timeline-comment-box.box-admin {
  background: var(--color-warning-50);
  border-left-color: var(--color-warning-500);
}

.timeline-comment-box.box-estudiante, .timeline-comment-box.box-student {
  background: var(--surface-app);
  border-left-color: var(--color-slate-500);
}

.comment-icon {
  margin-top: 2px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Sidebar Action Panel */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-slate-600);
}

.select-field, .textarea-field {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface-input);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--text-main);
  outline: none;
  transition: border-color 0.15s;
}

.select-field:focus, .textarea-field:focus {
  border-color: var(--border-focus);
  background: var(--surface-input-focus);
}

.textarea-field {
  resize: vertical;
}

.w-full {
  width: 100%;
}

/* Assigned Staff */
.assigned-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.profile-email {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.unassigned-profile {
  font-size: 13px;
  color: var(--text-subtle);
  font-style: italic;
}

/* SLA Tiempos */
.sla-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sla-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.sla-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sla-label {
  color: var(--text-muted);
}

.sla-val {
  font-weight: 600;
  color: var(--text-main);
}

.error-box {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-icon {
  color: var(--color-danger-500);
}

.p-button-icon-left {
  margin-right: 6px;
}

.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }

/* Estado actual en el panel de acciones */
.current-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.current-status-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
}

/* Aviso de estado final (sin transiciones) */
.final-state-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--color-warning-800);
  line-height: 1.5;
  margin-top: 4px;
}

.final-state-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-warning-600);
}

/* Hint de transiciones válidas */
.allowed-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}
</style>
