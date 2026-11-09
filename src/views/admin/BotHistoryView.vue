<template>
  <div class="bot-history-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-titles">
        <div class="title-with-badge">
          <h1 class="page-title">Historial de Interacciones del Bot</h1>
          <span class="bot-badge">
            <IconSparkles :size="14" />
            <span>NLP & FAQ Assistant</span>
          </span>
        </div>
        <p class="page-subtitle">
          Supervisa las conversaciones, precisión de intenciones y resoluciones autónomas del asistente virtual
        </p>
      </div>

      <div class="header-actions">
        <Button
          severity="secondary"
          outlined
          size="small"
          :loading="loading"
          @click="loadData"
        >
          <template #icon>
            <IconRefresh :size="16" class="p-button-icon-left" />
          </template>
          Actualizar
        </Button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-card">
      <div class="filter-item">
        <label class="filter-label">Resultado:</label>
        <select v-model="filters.resolved" class="custom-select" @change="applyFilters">
          <option value="">Todos los resultados</option>
          <option value="1">Resueltos por Bot</option>
          <option value="0">Escalados a Humano</option>
        </select>
      </div>

      <div class="filter-item">
        <label class="filter-label">Desde:</label>
        <div class="input-date-wrap">
          <input
            v-model="filters.date_from"
            type="date"
            class="custom-date-input"
            @change="applyFilters"
          />
        </div>
      </div>

      <div class="filter-item">
        <label class="filter-label">Hasta:</label>
        <div class="input-date-wrap">
          <input
            v-model="filters.date_to"
            type="date"
            class="custom-date-input"
            @change="applyFilters"
          />
        </div>
      </div>

      <Button
        v-if="hasActiveFilters"
        label="Limpiar filtros"
        severity="secondary"
        text
        size="small"
        @click="clearFilters"
      >
        <template #icon>
          <IconFilterOff :size="16" class="p-button-icon-left" />
        </template>
      </Button>
    </div>

    <!-- Tabla -->
    <div class="table-container">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="skeleton-wrapper">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <Skeleton width="50px" height="24px" />
          <Skeleton width="30%" height="24px" />
          <Skeleton width="120px" height="24px" />
          <Skeleton width="25%" height="24px" />
          <Skeleton width="70px" height="24px" />
          <Skeleton width="110px" height="24px" />
          <Skeleton width="80px" height="32px" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="interactions.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <IconRobot :size="48" stroke-width="1.5" />
        </div>
        <h3 class="empty-title">Sin interacciones registradas</h3>
        <p class="empty-desc">
          No se encontraron registros de conversaciones con el bot que coincidan con los filtros actuales.
        </p>
        <Button
          v-if="hasActiveFilters"
          label="Restablecer filtros"
          severity="primary"
          outlined
          size="small"
          @click="clearFilters"
        />
      </div>

      <!-- Tabla con datos -->
      <table v-else class="bot-table">
        <thead>
          <tr>
            <th class="th-id">ID</th>
            <th class="th-query">Consulta del Usuario</th>
            <th>Intención (NLP)</th>
            <th class="th-response">Respuesta Generada</th>
            <th>Tiempo</th>
            <th>Resultado</th>
            <th>Fecha</th>
            <th class="th-action">Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in interactions"
            :key="item.id"
            class="table-row"
            @click="openDetail(item)"
          >
            <td class="cell-id">
              <span class="id-tag">#{{ item.id }}</span>
            </td>

            <td class="cell-query" :title="item.query">
              <div class="query-content">
                <IconUser :size="15" class="row-user-icon" />
                <span class="truncate-text">{{ item.query }}</span>
              </div>
            </td>

            <td class="cell-intent">
              <span class="intent-pill">
                {{ item.intent || 'Desconocido' }}
              </span>
            </td>

            <td class="cell-response" :title="item.response">
              <div class="response-content">
                <IconRobot :size="15" class="row-bot-icon" />
                <span class="truncate-text">{{ item.response }}</span>
              </div>
            </td>

            <td class="cell-time">
              <span class="time-badge">
                <IconBolt :size="13" />
                {{ item.resolution_time_seconds }}s
              </span>
            </td>

            <td>
              <Tag
                :value="item.resolved ? 'Resuelto por Bot' : 'Escalado a Humano'"
                :severity="item.resolved ? 'success' : 'warn'"
                rounded
              >
                <template #icon>
                  <IconCheck v-if="item.resolved" :size="13" class="tag-inline-icon" />
                  <IconArrowBackUp v-else :size="13" class="tag-inline-icon" />
                </template>
              </Tag>
            </td>

            <td class="cell-date">
              {{ formatDate(item.created_at) }}
            </td>

            <td class="cell-action" @click.stop>
              <Button
                severity="secondary"
                outlined
                size="small"
                title="Ver conversación completa"
                @click="openDetail(item)"
              >
                <template #icon>
                  <IconEye :size="15" />
                </template>
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div v-if="meta && meta.last_page > 1" class="pagination-bar">
      <div class="pagination-info">
        Página <b>{{ meta.current_page }}</b> de <b>{{ meta.last_page }}</b>
      </div>

      <div class="pagination-controls">
        <Button
          severity="secondary"
          outlined
          size="small"
          :disabled="meta.current_page <= 1"
          @click="changePage(meta.current_page - 1)"
        >
          <template #icon>
            <IconChevronLeft :size="16" />
          </template>
          Anterior
        </Button>

        <Button
          severity="secondary"
          outlined
          size="small"
          :disabled="meta.current_page >= meta.last_page"
          @click="changePage(meta.current_page + 1)"
        >
          Siguiente
          <template #icon>
            <IconChevronRight :size="16" class="p-button-icon-right" />
          </template>
        </Button>
      </div>
    </div>

    <!-- Modal Dialog para Detalle Completo de Interacción -->
    <Dialog
      v-model:visible="detailVisible"
      modal
      header="Detalle de Interacción con el Asistente"
      :style="{ width: '640px', maxWidth: '95vw' }"
    >
      <div v-if="selectedItem" class="modal-content">
        <!-- Barra de estado superior del modal -->
        <div class="modal-status-bar">
          <Tag
            :value="selectedItem.resolved ? 'Resuelto por Asistente' : 'Escalado a Agente Humano'"
            :severity="selectedItem.resolved ? 'success' : 'warn'"
            rounded
          />

          <div class="modal-meta-chips">
            <span class="meta-chip-item">
              <IconBolt :size="14" class="text-amber" />
              <b>{{ selectedItem.resolution_time_seconds }} seg</b>
            </span>
            <span class="meta-chip-item">
              <IconCalendar :size="14" class="text-slate" />
              {{ formatDate(selectedItem.created_at) }}
            </span>
          </div>
        </div>

        <!-- Consulta del usuario -->
        <div class="dialog-bubble user-bubble">
          <div class="bubble-header">
            <div class="bubble-user-badge">
              <IconUser :size="16" />
              <span>Pregunta del Usuario</span>
            </div>
            <span class="bubble-time">#{{ selectedItem.id }}</span>
          </div>
          <div class="bubble-text">
            {{ selectedItem.query }}
          </div>
        </div>

        <!-- Intención Detectada -->
        <div class="intent-info-box">
          <div class="intent-title">
            <IconSparkles :size="16" class="text-purple" />
            <span>Intención clasificada por NLP:</span>
          </div>
          <span class="intent-tag-lg">{{ selectedItem.intent || 'No determinada' }}</span>
        </div>

        <!-- Respuesta del Bot -->
        <div class="dialog-bubble bot-bubble">
          <div class="bubble-header">
            <div class="bubble-bot-badge">
              <IconRobot :size="16" />
              <span>Respuesta del Asistente Virtual</span>
            </div>
          </div>
          <div class="bubble-text">
            {{ selectedItem.response }}
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cerrar" severity="secondary" @click="detailVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import {
  IconRobot,
  IconUser,
  IconBolt,
  IconCalendar,
  IconFilterOff,
  IconRefresh,
  IconEye,
  IconCheck,
  IconArrowBackUp,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-vue'
import { getBotInteractions } from '../../api/botInteractions.js'

const interactions   = ref([])
const meta           = ref(null)
const loading        = ref(false)
const page           = ref(1)
const filters        = ref({ resolved: '', date_from: '', date_to: '' })

// Modal de detalle
const detailVisible  = ref(false)
const selectedItem   = ref(null)

const hasActiveFilters = computed(() => {
  return filters.value.resolved !== '' || filters.value.date_from !== '' || filters.value.date_to !== ''
})

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value }
    if (filters.value.resolved !== '')  params.resolved  = filters.value.resolved
    if (filters.value.date_from)        params.date_from = filters.value.date_from
    if (filters.value.date_to)          params.date_to   = filters.value.date_to

    const { data } = await getBotInteractions(params)
    interactions.value = data.data
    meta.value = {
      current_page: data.current_page,
      last_page:    data.last_page,
    }
  } catch (err) {
    console.error('Error al cargar historial del bot', err)
  } finally {
    loading.value = false
  }
}

function openDetail(item) {
  selectedItem.value = item
  detailVisible.value = true
}

function applyFilters() {
  page.value = 1
  loadData()
}

function clearFilters() {
  filters.value = { resolved: '', date_from: '', date_to: '' }
  page.value = 1
  loadData()
}

function changePage(p) {
  page.value = p
  loadData()
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

onMounted(loadData)
</script>

<style scoped>
.bot-history-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0;
}

.bot-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ede9fe;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

/* Filters Card */
.filters-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
}

.custom-select, .custom-date-input {
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.custom-select:focus, .custom-date-input:focus {
  border-color: #0284c7;
  background: #ffffff;
}

/* Table */
.table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.bot-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.bot-table th {
  background: #f8fafc;
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.th-id { width: 70px; }
.th-query { min-width: 220px; max-width: 280px; }
.th-response { min-width: 220px; max-width: 280px; }
.th-action { width: 70px; text-align: center; }

.table-row {
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.15s;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-row td {
  padding: 14px 18px;
  font-size: 13.5px;
  color: #334155;
  vertical-align: middle;
}

.cell-id {
  font-family: var(--font-mono, monospace);
  font-weight: 600;
}

.id-tag {
  background: #f1f5f9;
  color: #0f172a;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 12px;
}

.query-content, .response-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-user-icon {
  color: #0284c7;
  flex-shrink: 0;
}

.row-bot-icon {
  color: #7c3aed;
  flex-shrink: 0;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.intent-pill {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.tag-inline-icon {
  margin-right: 4px;
}

.cell-date {
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
}

.cell-action {
  text-align: center;
}

/* Skeleton Loading */
.skeleton-wrapper {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
}

/* Empty State */
.empty-state {
  padding: 56px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px;
}

.empty-desc {
  font-size: 13.5px;
  color: #64748b;
  max-width: 400px;
  margin: 0 0 20px;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

/* Modal Content */
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-meta-chips {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-chip-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: #64748b;
}

.dialog-bubble {
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-bubble {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}

.bot-bubble {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bubble-user-badge, .bubble-bot-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}

.bubble-user-badge { color: #0284c7; }
.bubble-bot-badge { color: #7c3aed; }

.bubble-time {
  font-size: 11.5px;
  color: #94a3b8;
  font-family: var(--font-mono, monospace);
}

.bubble-text {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-wrap;
}

.intent-info-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}

.intent-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
}

.intent-tag-lg {
  font-size: 12px;
  font-weight: 700;
  color: #7c3aed;
  background: #ede9fe;
  padding: 2px 8px;
  border-radius: 6px;
}

.text-amber { color: #d97706; }
.text-slate { color: #64748b; }
.text-purple { color: #7c3aed; }
.p-button-icon-left { margin-right: 6px; }
.p-button-icon-right { margin-left: 6px; }
</style>
