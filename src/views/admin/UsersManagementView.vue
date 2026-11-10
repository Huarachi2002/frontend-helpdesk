<template>
  <div class="users-management-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Gestión de Usuarios y Roles de Agente</h1>
        <p class="page-subtitle">
          Administra usuarios del campus, niveles de atención técnica (Tier), prioridades y categorías designadas para tickets.
        </p>
      </div>

      <button class="btn-primary" @click="openCreateModal">
        <IconUserPlus :size="18" />
        <span>Nuevo Usuario</span>
      </button>
    </div>

    <!-- KPIs Rápidos -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon icon-blue">
          <IconUsers :size="22" />
        </div>
        <div class="kpi-info">
          <span class="kpi-value">{{ totalUsersCount }}</span>
          <span class="kpi-label">Total Usuarios</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-emerald">
          <IconHeadset :size="22" />
        </div>
        <div class="kpi-info">
          <span class="kpi-value">{{ supportAgentsCount }}</span>
          <span class="kpi-label">Agentes de Soporte</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-amber">
          <IconActivity :size="22" />
        </div>
        <div class="kpi-info">
          <span class="kpi-value">{{ activeAgentsCount }}</span>
          <span class="kpi-label">Agentes Activos</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-indigo">
          <IconShieldCheck :size="22" />
        </div>
        <div class="kpi-info">
          <span class="kpi-value">{{ adminsCount }}</span>
          <span class="kpi-label">Administradores</span>
        </div>
      </div>
    </div>

    <!-- Filtros de búsqueda -->
    <div class="filters-card">
      <div class="search-box">
        <IconSearch :size="18" class="search-icon" />
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar por nombre o correo electrónico..."
          class="search-input"
          @input="debounceSearch"
        />
        <button v-if="filters.search" class="clear-search-btn" @click="filters.search = ''; loadUsers()">
          <IconX :size="15" />
        </button>
      </div>

      <div class="filter-controls">
        <select v-model="filters.role" class="select-filter" @change="loadUsers">
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="support">Soporte Técnico</option>
          <option value="teacher">Docente</option>
          <option value="estudiante">Estudiante</option>
        </select>

        <select v-model="filters.tier_level" class="select-filter" @change="loadUsers">
          <option value="">Todos los niveles (Tier)</option>
          <option value="1">Nivel 1 (Básico)</option>
          <option value="2">Nivel 2 (Intermedio)</option>
          <option value="3">Nivel 3 (Especialista)</option>
        </select>

        <select v-model="filters.is_active" class="select-filter" @change="loadUsers">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">En pausa / Inactivos</option>
        </select>

        <button class="btn-refresh" title="Recargar lista" @click="loadUsers">
          <IconRefresh :size="17" :class="{ 'spin-icon': store.loading }" />
        </button>
      </div>
    </div>

    <!-- Tabla de Usuarios -->
    <div class="table-container">
      <div v-if="store.loading && store.users.length === 0" class="loading-state">
        <IconRefresh :size="32" class="spin-icon text-blue" />
        <span>Cargando directorio de usuarios y agentes...</span>
      </div>

      <div v-else-if="store.error" class="error-state">
        <IconAlertCircle :size="32" class="text-red" />
        <span>{{ store.error }}</span>
        <button class="btn-secondary mt-2" @click="loadUsers">Reintentar</button>
      </div>

      <div v-else-if="store.users.length === 0" class="empty-state">
        <IconUsers :size="42" class="text-muted" />
        <h3>No se encontraron usuarios</h3>
        <p>Prueba ajustando los filtros de búsqueda o registra un nuevo usuario.</p>
      </div>

      <table v-else class="users-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Departamento</th>
            <th>Nivel / Capacidad</th>
            <th>Prioridades Asignadas</th>
            <th>Categorías Designadas</th>
            <th>Estado Agente</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.users" :key="u.id">
            <!-- Usuario -->
            <td>
              <div class="user-cell">
                <div class="avatar" :class="'avatar-' + u.role">
                  {{ getUserInitials(u.name) }}
                </div>
                <div class="user-meta">
                  <span class="user-fullname">{{ u.name }}</span>
                  <span class="user-mail">{{ u.email }}</span>
                </div>
              </div>
            </td>

            <!-- Rol -->
            <td>
              <span :class="['role-pill', 'role-' + u.role]">
                {{ formatRole(u.role) }}
              </span>
            </td>

            <!-- Departamento -->
            <td>
              <span class="department-text">{{ u.department || '—' }}</span>
            </td>

            <!-- Nivel / Capacidad (Agentes) -->
            <td>
              <div v-if="isAgent(u)" class="agent-tier-box">
                <span class="tier-tag" :class="'tier-' + (u.support_agent?.tier_level || 1)">
                  Tier {{ u.support_agent?.tier_level || 1 }} ({{ tierLabel(u.support_agent?.tier_level) }})
                </span>
                <span class="capacity-hint">
                  {{ u.assigned_tickets_count || 0 }} activos / máx {{ u.support_agent?.max_active_tickets || 10 }}
                </span>
              </div>
              <span v-else class="text-muted text-xs">No aplica</span>
            </td>

            <!-- Prioridades Asignadas -->
            <td>
              <div v-if="isAgent(u)" class="priorities-wrapper">
                <template v-if="u.support_agent?.allowed_priorities?.length">
                  <span
                    v-for="p in u.support_agent.allowed_priorities"
                    :key="p"
                    :class="['prio-tag', 'prio-' + p]"
                  >
                    {{ priorityLabel(p) }}
                  </span>
                </template>
                <span v-else class="text-muted text-xs">Todas las prioridades</span>
              </div>
              <span v-else class="text-muted text-xs">—</span>
            </td>

            <!-- Categorías Designadas -->
            <td>
              <div v-if="isAgent(u)" class="categories-wrapper">
                <template v-if="u.support_agent?.categories?.length">
                  <span
                    v-for="cat in u.support_agent.categories"
                    :key="cat.id"
                    class="category-tag"
                    :title="cat.description"
                  >
                    {{ cat.name }}
                  </span>
                </template>
                <span v-else class="text-emerald font-semibold text-xs">
                  ★ Todas las categorías (General)
                </span>
              </div>
              <span v-else class="text-muted text-xs">—</span>
            </td>

            <!-- Estado Agente (Activo / En Pausa) -->
            <td>
              <div v-if="isAgent(u)" class="status-toggle-wrapper">
                <button
                  :class="['status-btn', u.support_agent?.is_active ? 'active' : 'paused']"
                  :title="u.support_agent?.is_active ? 'Clic para pausar disponibilidad' : 'Clic para activar disponibilidad'"
                  @click="handleToggleActive(u)"
                >
                  <span class="status-circle"></span>
                  <span>{{ u.support_agent?.is_active ? 'Activo' : 'En Pausa' }}</span>
                </button>
              </div>
              <span v-else class="text-muted text-xs">—</span>
            </td>

            <!-- Acciones -->
            <td class="text-right">
              <div class="actions-wrapper">
                <button
                  class="action-btn edit-btn"
                  title="Editar datos y configuración de roles"
                  @click="openEditModal(u)"
                >
                  <IconEdit :size="16" />
                </button>

                <button
                  v-if="u.id !== auth.user?.id"
                  class="action-btn delete-btn"
                  title="Eliminar usuario"
                  @click="confirmDeleteUser(u)"
                >
                  <IconTrash :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div v-if="store.pagination && store.pagination.last_page > 1" class="pagination-bar">
      <button
        class="page-btn"
        :disabled="store.pagination.current_page <= 1"
        @click="changePage(store.pagination.current_page - 1)"
      >
        ‹ Anterior
      </button>

      <span class="page-info">
        Página <b>{{ store.pagination.current_page }}</b> de <b>{{ store.pagination.last_page }}</b>
        ({{ store.pagination.total }} usuarios)
      </span>

      <button
        class="page-btn"
        :disabled="store.pagination.current_page >= store.pagination.last_page"
        @click="changePage(store.pagination.current_page + 1)"
      >
        Siguiente ›
      </button>
    </div>

    <!-- Modal Formulario Usuario & Roles -->
    <div v-if="modalVisible" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">
              {{ isEditing ? 'Editar Usuario y Roles de Agente' : 'Nuevo Usuario del Sistema' }}
            </h2>
            <span class="modal-subtitle">
              {{ isEditing ? 'Modifica la información y especialización asignada a este usuario.' : 'Crea un nuevo usuario con roles y configuración de atención.' }}
            </span>
          </div>
          <button class="modal-close-btn" @click="closeModal">
            <IconX :size="20" />
          </button>
        </div>

        <form class="modal-form" @submit.prevent="submitForm">
          <!-- Pestañas internas -->
          <div class="modal-tabs">
            <button
              type="button"
              :class="['tab-btn', { active: activeTab === 'account' }]"
              @click="activeTab = 'account'"
            >
              <IconUser :size="16" />
              <span>1. Cuenta y Perfil</span>
            </button>

            <button
              type="button"
              :class="['tab-btn', { active: activeTab === 'agent' }]"
              :disabled="!isAgentRoleSelected"
              @click="activeTab = 'agent'"
            >
              <IconHeadset :size="16" />
              <span>2. Especialización y Roles de Agente</span>
              <span v-if="!isAgentRoleSelected" class="tab-badge-disabled">Solo Soporte/Admin</span>
            </button>
          </div>

          <!-- TAB 1: Cuenta y Perfil -->
          <div v-show="activeTab === 'account'" class="tab-pane">
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Nombre completo *</label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  placeholder="Ej. Ing. Roberto Mendoza"
                  class="input-field"
                />
              </div>

              <div class="form-group flex-1">
                <label class="form-label">Correo electrónico *</label>
                <input
                  v-model="formData.email"
                  type="email"
                  required
                  placeholder="usuario@helpdesk.com"
                  class="input-field"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">
                  Contraseña {{ isEditing ? '(Opcional, dejar vacía para conservar)' : '*' }}
                </label>
                <input
                  v-model="formData.password"
                  type="password"
                  :required="!isEditing"
                  placeholder="Mínimo 6 caracteres"
                  class="input-field"
                />
              </div>

              <div class="form-group flex-1">
                <label class="form-label">Rol en la plataforma *</label>
                <select v-model="formData.role" required class="select-field">
                  <option value="support">Soporte Técnico (Agente)</option>
                  <option value="admin">Administrador del Sistema</option>
                  <option value="teacher">Docente</option>
                  <option value="estudiante">Estudiante</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Departamento o Facultad</label>
              <input
                v-model="formData.department"
                type="text"
                placeholder="Ej. Soporte Tecnológico, Facultad de Ingeniería, etc."
                class="input-field"
              />
            </div>
          </div>

          <!-- TAB 2: Roles de Agente y Atención de Tickets -->
          <div v-show="activeTab === 'agent'" class="tab-pane">
            <div class="agent-info-banner">
              <IconInfoCircle :size="18" class="text-blue" />
              <span>
                Esta configuración determina la lógica de <strong>asignación automática</strong> cuando ingresan tickets desde Moodle o el Widget de soporte.
              </span>
            </div>

            <div class="form-row mt-3">
              <!-- Nivel / Tier -->
              <div class="form-group flex-1">
                <label class="form-label">Nivel de Atención (Tier Escalado)</label>
                <select v-model="formData.tier_level" class="select-field">
                  <option :value="1">Nivel 1 — Soporte Básico / Respuestas Frecuentes</option>
                  <option :value="2">Nivel 2 — Técnico Intermedio / Diagnóstico</option>
                  <option :value="3">Nivel 3 — Especialista / Administrador Crítico</option>
                </select>
              </div>

              <!-- Límite de carga -->
              <div class="form-group flex-1">
                <label class="form-label">Capacidad máxima de tickets concurrentes</label>
                <input
                  v-model.number="formData.max_active_tickets"
                  type="number"
                  min="1"
                  max="50"
                  class="input-field"
                />
              </div>
            </div>

            <!-- Nivel de Prioridad de Tickets que puede atender -->
            <div class="form-group mt-3">
              <label class="form-label">
                Prioridades de ticket que puede atender:
                <span class="hint-text">(Si no marcas ninguna, atenderá cualquier prioridad)</span>
              </label>

              <div class="checkbox-pills-grid">
                <label class="checkbox-pill">
                  <input
                    v-model="formData.allowed_priorities"
                    type="checkbox"
                    value="low"
                  />
                  <span class="pill-badge prio-low">Baja (Low)</span>
                </label>

                <label class="checkbox-pill">
                  <input
                    v-model="formData.allowed_priorities"
                    type="checkbox"
                    value="medium"
                  />
                  <span class="pill-badge prio-medium">Media (Medium)</span>
                </label>

                <label class="checkbox-pill">
                  <input
                    v-model="formData.allowed_priorities"
                    type="checkbox"
                    value="high"
                  />
                  <span class="pill-badge prio-high">Alta (High)</span>
                </label>

                <label class="checkbox-pill">
                  <input
                    v-model="formData.allowed_priorities"
                    type="checkbox"
                    value="critical"
                  />
                  <span class="pill-badge prio-critical">Crítica (Critical)</span>
                </label>
              </div>
            </div>

            <!-- Categorías de Ticket que puede atender -->
            <div class="form-group mt-3">
              <div class="categories-header-row">
                <label class="form-label">
                  Categorías de ticket designadas:
                  <span class="hint-text">(Si no marcas ninguna, atenderá todas como agente comodín)</span>
                </label>
                <div class="quick-select-btns">
                  <button type="button" class="btn-link-xs" @click="selectAllCategories">Marcar todas</button>
                  <span class="divider-xs">·</span>
                  <button type="button" class="btn-link-xs" @click="formData.category_ids = []">Desmarcar</button>
                </div>
              </div>

              <div class="categories-grid-selection">
                <label
                  v-for="cat in store.categories"
                  :key="cat.id"
                  class="category-check-item"
                  :class="{ selected: formData.category_ids.includes(cat.id) }"
                >
                  <input
                    v-model="formData.category_ids"
                    type="checkbox"
                    :value="cat.id"
                  />
                  <div class="cat-check-text">
                    <span class="cat-name">{{ cat.name }}</span>
                    <span class="cat-desc">{{ cat.description }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Disponibilidad para Asignación -->
            <div class="form-group mt-3">
              <label class="toggle-availability-label">
                <input
                  v-model="formData.is_active"
                  type="checkbox"
                  class="toggle-checkbox"
                />
                <div class="toggle-details">
                  <span class="toggle-title">Agente Activo para Asignación Automática</span>
                  <span class="toggle-subtitle">
                    Al desmarcar esta opción, el agente no recibirá tickets asignados automáticamente pero podrá seguir usando la plataforma.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Mensaje de error general del formulario -->
          <div v-if="formError" class="form-error-alert">
            <IconAlertCircle :size="18" />
            <span>{{ formError }}</span>
          </div>

          <!-- Footer del Modal -->
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="formSubmitting">
              <IconDeviceFloppy :size="18" />
              <span>{{ formSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Usuario' : 'Crear Usuario') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
  IconUsers,
  IconUserPlus,
  IconUser,
  IconHeadset,
  IconActivity,
  IconShieldCheck,
  IconSearch,
  IconX,
  IconRefresh,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconInfoCircle,
  IconDeviceFloppy,
} from '@tabler/icons-vue'
import { useUsersStore } from '../../stores/users.js'
import { useAuthStore } from '../../stores/auth.js'

const store = useUsersStore()
const auth  = useAuthStore()
const toast = useToast()

const filters = reactive({
  search: '',
  role: '',
  tier_level: '',
  is_active: '',
  page: 1,
})

let searchTimeout = null
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.page = 1
    loadUsers()
  }, 350)
}

function loadUsers() {
  const params = {
    page: filters.page,
  }
  if (filters.search) params.search = filters.search
  if (filters.role) params.role = filters.role
  if (filters.tier_level) params.tier_level = filters.tier_level
  if (filters.is_active !== '') params.is_active = filters.is_active

  store.fetchUsers(params)
}

function changePage(p) {
  filters.page = p
  loadUsers()
}

// Estadísticas de cabecera
const totalUsersCount = computed(() => store.pagination?.total || store.users.length)
const supportAgentsCount = computed(() => store.users.filter(u => u.role === 'support').length)
const activeAgentsCount = computed(() => store.users.filter(u => u.support_agent?.is_active).length)
const adminsCount = computed(() => store.users.filter(u => u.role === 'admin').length)

// Modal State
const modalVisible = ref(false)
const isEditing = ref(false)
const activeTab = ref('account')
const formSubmitting = ref(false)
const formError = ref('')

const defaultForm = {
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'support',
  department: '',
  is_active: true,
  tier_level: 1,
  allowed_priorities: ['low', 'medium', 'high', 'critical'],
  max_active_tickets: 10,
  category_ids: [],
}

const formData = reactive({ ...defaultForm })

const isAgentRoleSelected = computed(() => {
  return formData.role === 'support' || formData.role === 'admin'
})

function isAgent(user) {
  return user.role === 'support' || user.role === 'admin'
}

function openCreateModal() {
  isEditing.value = false
  formError.value = ''
  activeTab.value = 'account'
  Object.assign(formData, defaultForm, {
    category_ids: store.categories.map(c => c.id), // por defecto todas
  })
  modalVisible.value = true
}

function openEditModal(user) {
  isEditing.value = true
  formError.value = ''
  activeTab.value = 'account'

  const agent = user.support_agent || {}
  Object.assign(formData, {
    id: user.id,
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    department: user.department || '',
    is_active: agent.is_active ?? true,
    tier_level: agent.tier_level ?? 1,
    allowed_priorities: agent.allowed_priorities ? [...agent.allowed_priorities] : ['low', 'medium', 'high', 'critical'],
    max_active_tickets: agent.max_active_tickets ?? 10,
    category_ids: agent.categories ? agent.categories.map(c => c.id) : [],
  })

  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
}

function selectAllCategories() {
  formData.category_ids = store.categories.map(c => c.id)
}

async function submitForm() {
  formSubmitting.value = true
  formError.value = ''

  try {
    const payload = { ...formData }
    if (isEditing.value && !payload.password) {
      delete payload.password
    }

    const res = await store.saveUser(payload)
    toast.add({
      severity: 'success',
      summary: isEditing.value ? 'Usuario Actualizado' : 'Usuario Creado',
      detail: res.message || 'Operación completada con éxito.',
      life: 3500,
    })
    closeModal()
    loadUsers()
  } catch (err) {
    formError.value = err.response?.data?.message || 'Error al guardar los datos del usuario.'
  } finally {
    formSubmitting.value = false
  }
}

async function handleToggleActive(user) {
  try {
    const res = await store.toggleStatus(user.id)
    toast.add({
      severity: 'info',
      summary: 'Disponibilidad Actualizada',
      detail: `El agente ${user.name} ahora está ${res.is_active ? 'Activo' : 'en Pausa'}.`,
      life: 2500,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'No se pudo actualizar el estado.',
      life: 3500,
    })
  }
}

async function confirmDeleteUser(user) {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${user.name}"?`)) {
    try {
      await store.deleteUserRecord(user.id)
      toast.add({
        severity: 'success',
        summary: 'Usuario Eliminado',
        detail: `Se eliminó al usuario ${user.name} correctamente.`,
        life: 3000,
      })
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'No se pudo eliminar',
        detail: err.response?.data?.message || 'Error al eliminar el usuario.',
        life: 4000,
      })
    }
  }
}

// Helpers visuales
function getUserInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatRole(role) {
  const map = {
    admin: 'Administrador',
    support: 'Soporte Técnico',
    teacher: 'Docente',
    estudiante: 'Estudiante',
  }
  return map[role] ?? role
}

function tierLabel(t) {
  const map = {
    1: 'Básico',
    2: 'Intermedio',
    3: 'Especialista',
  }
  return map[t] ?? 'Básico'
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

onMounted(() => {
  loadUsers()
  store.fetchCategories()
})
</script>

<style scoped>
.users-management-view {
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

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.4px;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13.5px;
  color: var(--text-muted);
  margin: 0;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary-600);
  color: var(--text-inverse);
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-700);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-muted);
  color: var(--text-body);
  border: 1px solid var(--border-strong);
  padding: 9px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--border-default);
}

/* KPIs */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-blue    { background: var(--color-primary-100); color: var(--color-primary-600); }
.icon-emerald { background: var(--color-success-100); color: var(--color-success-600); }
.icon-amber   { background: var(--color-warning-100); color: var(--color-warning-600); }
.icon-indigo  { background: var(--color-purple-100);  color: var(--chart-secondary); }

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
}

.kpi-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* Filters */
.filters-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  color: var(--text-subtle);
}

.search-input {
  width: 100%;
  padding: 9px 36px 9px 36px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13.5px;
  background: var(--surface-input);
  outline: none;
  transition: all 0.15s;
}

.search-input:focus {
  border-color: var(--border-focus);
  background: var(--surface-input-focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-filter {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13px;
  background: var(--surface-input);
  color: var(--text-body);
  outline: none;
}

.select-filter:focus {
  border-color: var(--border-focus);
  background: var(--surface-input-focus);
}

.btn-refresh {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-muted);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  color: var(--color-slate-600);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-refresh:hover {
  background: var(--border-default);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Table */
.table-container {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  text-align: left;
}

.users-table th {
  background: var(--surface-app);
  padding: 13px 16px;
  color: var(--color-slate-600);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-default);
}

.users-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-body);
  vertical-align: middle;
}

.users-table tr:hover td {
  background: var(--surface-card-hover);
}

/* Cells */
.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.avatar-admin      { background: var(--color-purple-100);  color: var(--chart-secondary); }
.avatar-support    { background: var(--color-primary-100); color: var(--color-primary-600); }
.avatar-teacher    { background: var(--color-warning-100); color: var(--color-warning-600); }
.avatar-estudiante { background: var(--surface-muted);     color: var(--color-slate-600); }

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-fullname {
  font-weight: 600;
  color: var(--text-main);
}

.user-mail {
  font-size: 12px;
  color: var(--text-muted);
}

.role-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.role-admin      { background: var(--color-purple-100);  color: var(--chart-secondary); }
.role-support    { background: var(--color-primary-100); color: var(--color-primary-700); }
.role-teacher    { background: var(--color-warning-100); color: var(--color-warning-700); }
.role-estudiante { background: var(--surface-muted);     color: var(--color-slate-600); }

.department-text {
  font-size: 13px;
  color: var(--text-muted);
}

/* Agent tier & capacity */
.agent-tier-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tier-tag {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  width: fit-content;
}

.tier-1 { background: var(--color-primary-100); color: var(--color-primary-700); }
.tier-2 { background: var(--color-purple-100);  color: var(--color-purple-700); }
.tier-3 { background: var(--color-warning-100); color: var(--color-warning-700); }

.capacity-hint {
  font-size: 11.5px;
  color: var(--text-muted);
}

/* Priorities & Categories wrappers */
.priorities-wrapper, .categories-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 220px;
}

.prio-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.prio-low      { background: var(--priority-low-bg);      color: var(--priority-low-text); }
.prio-medium   { background: var(--priority-medium-bg);   color: var(--priority-medium-text); }
.prio-high     { background: var(--priority-high-bg);     color: var(--priority-high-text); }
.prio-critical { background: var(--priority-critical-bg); color: var(--priority-critical-text); }

.category-tag {
  background: var(--surface-muted);
  border: 1px solid var(--border-default);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-body);
  white-space: nowrap;
}

/* Status toggle button */
.status-toggle-wrapper {
  display: flex;
  align-items: center;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-circle {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-btn.active {
  background: var(--color-success-50);
  border-color: var(--color-success-200);
  color: var(--color-success-600);
}
.status-btn.active .status-circle { background: var(--color-success-500); }

.status-btn.paused {
  background: var(--color-danger-50);
  border-color: var(--color-danger-200);
  color: var(--color-danger-600);
}
.status-btn.paused .status-circle { background: var(--color-danger-500); }

.status-btn:hover {
  transform: scale(1.03);
}

/* Actions */
.actions-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-btn {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-600);
}
.edit-btn:hover { background: var(--color-primary-600); color: var(--text-inverse); }

.delete-btn {
  background: var(--color-danger-50);
  border-color: var(--color-danger-200);
  color: var(--color-danger-600);
}
.delete-btn:hover { background: var(--color-danger-600); color: var(--text-inverse); }

/* States */
.loading-state, .error-state, .empty-state {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 0;
}

.page-btn {
  padding: 7px 14px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface-card);
  color: var(--text-body);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn:hover:not(:disabled) { background: var(--surface-app); border-color: var(--text-subtle); }

.page-info {
  font-size: 13px;
  color: var(--text-muted);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(3px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--surface-card);
  border-radius: 16px;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 4px;
}

.modal-subtitle {
  font-size: 12.5px;
  color: var(--text-muted);
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.modal-close-btn:hover { color: var(--text-main); }

.modal-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

/* Modal Tabs */
.modal-tabs {
  display: flex;
  background: var(--surface-app);
  border-bottom: 1px solid var(--border-default);
  padding: 0 16px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active {
  color: var(--color-primary-600);
  border-bottom-color: var(--color-primary-600);
  background: var(--surface-card);
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-badge-disabled {
  font-size: 10px;
  background: var(--border-default);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: 10px;
}

.tab-pane {
  padding: 20px 24px;
  overflow-y: auto;
  max-height: 520px;
}

/* Forms */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-body);
}

.input-field, .select-field {
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--text-main);
  background: var(--surface-input);
  outline: none;
  transition: all 0.15s;
}

.input-field:focus, .select-field:focus {
  border-color: var(--border-focus);
  background: var(--surface-input-focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.hint-text {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 11.5px;
}

.agent-info-banner {
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: var(--color-primary-700);
}

/* Checkbox pills for priorities */
.checkbox-pills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.checkbox-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-app);
  border: 1px solid var(--border-strong);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.checkbox-pill:hover {
  background: var(--surface-muted);
}

.pill-badge {
  font-size: 12px;
  font-weight: 700;
}

/* Categories selection */
.categories-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.quick-select-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-link-xs {
  background: transparent;
  border: none;
  color: var(--color-primary-600);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.btn-link-xs:hover { text-decoration: underline; }

.divider-xs { color: var(--border-strong); }

.categories-grid-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 8px;
  background: var(--surface-app);
}

.category-check-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all 0.15s;
}

.category-check-item.selected {
  border-color: var(--border-focus);
  background: var(--color-primary-50);
}

.cat-check-text {
  display: flex;
  flex-direction: column;
}

.cat-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
}

.cat-desc {
  font-size: 10.5px;
  color: var(--text-muted);
}

/* Toggle availability */
.toggle-availability-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--surface-app);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
}

.toggle-checkbox {
  margin-top: 3px;
  transform: scale(1.2);
}

.toggle-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.toggle-subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
}

.form-error-alert {
  margin: 0 24px 16px;
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-600);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-default);
  background: var(--surface-app);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.flex-1 { flex: 1; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.text-right { text-align: right; }
.text-xs { font-size: 11.5px; }
.font-semibold { font-weight: 600; }
.text-muted   { color: var(--text-subtle); }
.text-blue    { color: var(--color-primary-600); }
.text-emerald { color: var(--color-success-600); }
.text-red     { color: var(--color-danger-600); }
</style>
