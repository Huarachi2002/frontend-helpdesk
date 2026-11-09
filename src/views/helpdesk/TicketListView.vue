<template>
  <div class="tickets-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-titles">
        <h1 class="page-title">Gestión de Tickets de Incidencias</h1>
        <p class="page-subtitle">
          Supervisa, clasifica y atiende los tickets reportados en la plataforma
          <span v-if="store.pagination?.total != null" class="total-pill">
            {{ store.pagination.total }} tickets
          </span>
        </p>
      </div>

      <div class="header-actions">
        <Button
          severity="secondary"
          outlined
          size="small"
          :loading="store.loading"
          @click="loadTickets"
        >
          <template #icon>
            <IconRefresh :size="16" class="p-button-icon-left" />
          </template>
          Actualizar
        </Button>
      </div>
    </div>

    <!-- Barra de Búsqueda y Filtros -->
    <div class="filters-card">
      <div class="search-box">
        <IconSearch :size="18" class="search-icon" />
        <input
          v-model="filters.search"
          placeholder="Buscar por título o descripción..."
          class="search-input"
          @keyup.enter="applyFilters"
        />
        <button
          v-if="filters.search"
          class="search-clear-btn"
          @click="filters.search = ''; applyFilters()"
        >
          ✕
        </button>
      </div>

      <div class="filters-group">
        <div class="filter-item">
          <label class="filter-label">Estado:</label>
          <select v-model="filters.status" class="custom-select" @change="applyFilters">
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En Proceso</option>
            <option value="waiting">Esperando Respuesta</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="filter-label">Prioridad:</label>
          <select v-model="filters.priority" class="custom-select" @change="applyFilters">
            <option value="">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
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
    </div>

    <!-- Contenedor de la Tabla -->
    <div class="table-container">
      <!-- Loading Skeleton -->
      <div v-if="store.loading" class="skeleton-wrapper">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="30%" height="24px" />
          <Skeleton width="90px" height="24px" />
          <Skeleton width="80px" height="24px" />
          <Skeleton width="120px" height="24px" />
          <Skeleton width="100px" height="24px" />
          <Skeleton width="70px" height="32px" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="store.error" class="error-container">
        <IconAlertCircle :size="36" class="error-icon" />
        <div class="error-title">No fue posible cargar los tickets</div>
        <div class="error-desc">{{ store.error }}</div>
        <Button label="Reintentar" severity="danger" size="small" @click="loadTickets" />
      </div>

      <!-- Empty State -->
      <div v-else-if="store.tickets.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <IconInbox :size="48" stroke-width="1.5" />
        </div>
        <h3 class="empty-title">No se encontraron tickets</h3>
        <p class="empty-desc">
          No hay incidencias que coincidan con los criterios de búsqueda o filtros seleccionados.
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

      <!-- Tabla de Datos -->
      <table v-else class="tickets-table">
        <thead>
          <tr>
            <th class="th-id">ID</th>
            <th class="th-title">Título de Incidencia</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Categoría</th>
            <th>Asignado</th>
            <th>Fecha</th>
            <th class="th-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in store.tickets" :key="t.id" class="table-row">
            <td class="cell-id">
              <span class="id-tag">#{{ t.id }}</span>
            </td>

            <td class="cell-title">
              <RouterLink :to="`/tickets/${t.id}`" class="title-link">
                {{ t.title }}
              </RouterLink>
              <div v-if="t.category?.name || t.moodle_data?.course" class="title-meta">
                <span v-if="t.moodle_data?.course">{{ t.moodle_data.course }}</span>
              </div>
            </td>

            <td>
              <Tag
                :value="statusLabel(t.status)"
                :severity="statusSeverity(t.status)"
                rounded
              />
            </td>

            <td>
              <Tag
                :value="priorityLabel(t.priority)"
                :severity="prioritySeverity(t.priority)"
                rounded
              />
            </td>

            <td class="cell-category">
              <span class="category-pill">{{ t.category?.name ?? 'General' }}</span>
            </td>

            <td class="cell-assigned">
              <div v-if="t.assigned_to?.name" class="assigned-user">
                <div class="user-mini-avatar">
                  {{ t.assigned_to.name.charAt(0).toUpperCase() }}
                </div>
                <span class="user-name-text">{{ t.assigned_to.name }}</span>
              </div>
              <span v-else class="unassigned-text">Sin asignar</span>
            </td>

            <td class="cell-date">
              {{ formatDate(t.times?.created_at) }}
            </td>

            <td class="cell-actions">
              <RouterLink :to="`/tickets/${t.id}`">
                <Button label="Ver" severity="secondary" outlined size="small">
                  <template #icon>
                    <IconEye :size="15" class="p-button-icon-left" />
                  </template>
                </Button>
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div v-if="store.pagination && store.pagination.last_page > 1" class="pagination-bar">
      <div class="pagination-info">
        Página <b>{{ store.pagination.current_page }}</b> de <b>{{ store.pagination.last_page }}</b>
      </div>

      <div class="pagination-controls">
        <Button
          severity="secondary"
          outlined
          size="small"
          :disabled="store.pagination.current_page <= 1"
          @click="changePage(store.pagination.current_page - 1)"
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
          :disabled="store.pagination.current_page >= store.pagination.last_page"
          @click="changePage(store.pagination.current_page + 1)"
        >
          Siguiente
          <template #icon>
            <IconChevronRight :size="16" class="p-button-icon-right" />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import {
  IconSearch,
  IconFilterOff,
  IconRefresh,
  IconEye,
  IconInbox,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-vue'
import { useTicketsStore } from '../../stores/tickets.js'

const store   = useTicketsStore()
const page    = ref(1)
const filters = ref({ search: '', status: '', priority: '' })

const hasActiveFilters = computed(() => {
  return filters.value.search !== '' || filters.value.status !== '' || filters.value.priority !== ''
})

function applyFilters() {
  page.value = 1
  loadTickets()
}

function clearFilters() {
  filters.value = { search: '', status: '', priority: '' }
  page.value = 1
  loadTickets()
}

function changePage(p) {
  page.value = p
  loadTickets()
}

function loadTickets() {
  const params = { page: page.value }
  if (filters.value.search)   params.search   = filters.value.search
  if (filters.value.status)   params.status   = filters.value.status
  if (filters.value.priority) params.priority = filters.value.priority
  store.fetchTickets(params)
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

onMounted(loadTickets)
</script>

<style scoped>
.tickets-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Page Header */
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.total-pill {
  background: #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

/* Filters Card */
.filters-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 260px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 36px 9px 38px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  background: #ffffff;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.search-clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  font-size: 13px;
}

.search-clear-btn:hover {
  color: #475569;
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
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

.custom-select {
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

.custom-select:focus {
  border-color: #0284c7;
  background: #ffffff;
}

/* Table Container */
.table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tickets-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.tickets-table th {
  background: #f8fafc;
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.th-id { width: 80px; }
.th-title { min-width: 250px; }
.th-actions { width: 90px; text-align: center; }

.table-row {
  border-bottom: 1px solid #f1f5f9;
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

.cell-title {
  max-width: 320px;
}

.title-link {
  font-weight: 600;
  color: #0f172a;
  text-decoration: none;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.15s;
}

.title-link:hover {
  color: #0284c7;
}

.title-meta {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 2px;
}

.cell-category {
  font-size: 12.5px;
}

.category-pill {
  background: #f1f5f9;
  color: #475569;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.assigned-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-mini-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name-text {
  font-size: 13px;
  color: #1e293b;
  white-space: nowrap;
}

.unassigned-text {
  font-size: 12.5px;
  color: #94a3b8;
  font-style: italic;
}

.cell-date {
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
}

.cell-actions {
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

/* Error Container */
.error-container {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-icon {
  color: #ef4444;
}

.error-title {
  font-size: 16px;
  font-weight: 700;
  color: #991b1b;
}

.error-desc {
  font-size: 13.5px;
  color: #64748b;
}

/* Pagination Bar */
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

.p-button-icon-left {
  margin-right: 6px;
}

.p-button-icon-right {
  margin-left: 6px;
}
</style>
