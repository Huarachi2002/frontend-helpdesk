import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  IconUsers,
  IconUserPlus,
  IconSearch,
  IconX,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconShieldCheck,
  IconHeadset,
  IconActivity,
  IconUser,
  IconInfoCircle,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useUsersStore } from '../../stores/usersStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import './UsersManagementView.css'

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

export default function UsersManagementView() {
  const users = useUsersStore((state) => state.users)
  const pagination = useUsersStore((state) => state.pagination)
  const categories = useUsersStore((state) => state.categories)
  const loading = useUsersStore((state) => state.loading)
  const error = useUsersStore((state) => state.error)
  const fetchUsers = useUsersStore((state) => state.fetchUsers)
  const fetchCategories = useUsersStore((state) => state.fetchCategories)
  const saveUser = useUsersStore((state) => state.saveUser)
  const toggleStatus = useUsersStore((state) => state.toggleStatus)
  const deleteUserRecord = useUsersStore((state) => state.deleteUserRecord)

  const currentUser = useAuthStore((state) => state.user)
  const { showToast } = useToast()

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    tier_level: '',
    is_active: '',
  })

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({ ...defaultForm })

  const loadUsers = useCallback(
    (targetPage = page, currentFilters = filters) => {
      const params = { page: targetPage }
      if (currentFilters.search) params.search = currentFilters.search
      if (currentFilters.role) params.role = currentFilters.role
      if (currentFilters.tier_level) params.tier_level = currentFilters.tier_level
      if (currentFilters.is_active !== '') params.is_active = currentFilters.is_active
      fetchUsers(params).catch(() => {})
    },
    [fetchUsers, page, filters]
  )

  useEffect(() => {
    loadUsers(page, filters)
    fetchCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadUsers(page, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Métricas rápidas calculadas
  const totalUsersCount = pagination?.total ?? users.length
  const supportAgentsCount = useMemo(
    () => users.filter((u) => u.role === 'support').length,
    [users]
  )
  const activeAgentsCount = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.role === 'support' || u.role === 'admin') &&
          u.support_agent?.is_active
      ).length,
    [users]
  )
  const adminsCount = useMemo(
    () => users.filter((u) => u.role === 'admin').length,
    [users]
  )

  const isAgent = (u) => u.role === 'support' || u.role === 'admin'
  const isAgentRoleSelected =
    formData.role === 'support' || formData.role === 'admin'

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)
    setPage(1)
    loadUsers(1, nextFilters)
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setFilters((prev) => ({ ...prev, search: val }))
  }

  const applySearch = () => {
    setPage(1)
    loadUsers(1, filters)
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setFormError('')
    setActiveTab('account')
    setFormData({
      ...defaultForm,
      category_ids: categories.map((c) => c.id),
    })
    setModalVisible(true)
  }

  const openEditModal = (u) => {
    setIsEditing(true)
    setFormError('')
    setActiveTab('account')

    const agent = u.support_agent || {}
    setFormData({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      department: u.department || '',
      is_active: agent.is_active ?? true,
      tier_level: agent.tier_level ?? 1,
      allowed_priorities: agent.allowed_priorities
        ? [...agent.allowed_priorities]
        : ['low', 'medium', 'high', 'critical'],
      max_active_tickets: agent.max_active_tickets ?? 10,
      category_ids: agent.categories ? agent.categories.map((c) => c.id) : [],
    })

    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  const selectAllCategories = () => {
    setFormData((prev) => ({
      ...prev,
      category_ids: categories.map((c) => c.id),
    }))
  }

  const handlePriorityToggle = (prio) => {
    setFormData((prev) => {
      const exists = prev.allowed_priorities.includes(prio)
      const next = exists
        ? prev.allowed_priorities.filter((p) => p !== prio)
        : [...prev.allowed_priorities, prio]
      return { ...prev, allowed_priorities: next }
    })
  }

  const handleCategoryToggle = (catId) => {
    setFormData((prev) => {
      const exists = prev.category_ids.includes(catId)
      const next = exists
        ? prev.category_ids.filter((id) => id !== catId)
        : [...prev.category_ids, catId]
      return { ...prev, category_ids: next }
    })
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    try {
      const payload = { ...formData }
      if (isEditing && !payload.password) {
        delete payload.password
      }

      const res = await saveUser(payload)
      showToast({
        severity: 'success',
        summary: isEditing ? 'Usuario Actualizado' : 'Usuario Creado',
        detail: res.message || 'Operación completada con éxito.',
        life: 3500,
      })
      closeModal()
      loadUsers(page, filters)
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Error al guardar los datos del usuario.'
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleActive = async (u) => {
    try {
      const res = await toggleStatus(u.id)
      showToast({
        severity: 'info',
        summary: 'Disponibilidad Actualizada',
        detail: `El agente ${u.name} ahora está ${
          res.is_active ? 'Activo' : 'en Pausa'
        }.`,
        life: 2500,
      })
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'No se pudo actualizar el estado.',
        life: 3500,
      })
    }
  }

  const confirmDeleteUser = async (u) => {
    if (
      window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente a "${u.name}"?`
      )
    ) {
      try {
        await deleteUserRecord(u.id)
        showToast({
          severity: 'success',
          summary: 'Usuario Eliminado',
          detail: `Se eliminó al usuario ${u.name} correctamente.`,
          life: 3000,
        })
      } catch (err) {
        showToast({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: err.response?.data?.message || 'Error al eliminar el usuario.',
          life: 4000,
        })
      }
    }
  }

  const getUserInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const formatRole = (role) => {
    const map = {
      admin: 'Administrador',
      support: 'Soporte Técnico',
      teacher: 'Docente',
      estudiante: 'Estudiante',
    }
    return map[role] ?? role
  }

  const tierLabel = (t) => {
    const map = {
      1: 'Básico',
      2: 'Intermedio',
      3: 'Especialista',
    }
    return map[t] ?? 'Básico'
  }

  const priorityLabel = (p) => {
    const map = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    }
    return map[p] ?? p
  }

  return (
    <div className="users-management-view">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Gestión de Usuarios y Roles de Agente</h1>
          <p className="page-subtitle">
            Administra usuarios del campus, niveles de atención técnica (Tier), prioridades y categorías designadas para tickets.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal}>
          <IconUserPlus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* KPIs Rápidos */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon icon-blue">
            <IconUsers size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{totalUsersCount}</span>
            <span className="kpi-label">Total Usuarios</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon icon-emerald">
            <IconHeadset size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{supportAgentsCount}</span>
            <span className="kpi-label">Agentes de Soporte</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon icon-amber">
            <IconActivity size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{activeAgentsCount}</span>
            <span className="kpi-label">Agentes Activos</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon icon-indigo">
            <IconShieldCheck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{adminsCount}</span>
            <span className="kpi-label">Administradores</span>
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <div className="filters-card">
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            value={filters.search}
            type="text"
            placeholder="Buscar por nombre o correo electrónico..."
            className="search-input"
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          {filters.search && (
            <button
              className="clear-search-btn"
              onClick={() => {
                const next = { ...filters, search: '' }
                setFilters(next)
                loadUsers(1, next)
              }}
              aria-label="Limpiar búsqueda"
            >
              <IconX size={15} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <select
            name="role"
            value={filters.role}
            className="select-filter"
            onChange={handleFilterChange}
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="support">Soporte Técnico</option>
            <option value="teacher">Docente</option>
            <option value="estudiante">Estudiante</option>
          </select>

          <select
            name="tier_level"
            value={filters.tier_level}
            className="select-filter"
            onChange={handleFilterChange}
          >
            <option value="">Todos los niveles (Tier)</option>
            <option value="1">Nivel 1 (Básico)</option>
            <option value="2">Nivel 2 (Intermedio)</option>
            <option value="3">Nivel 3 (Especialista)</option>
          </select>

          <select
            name="is_active"
            value={filters.is_active}
            className="select-filter"
            onChange={handleFilterChange}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">En pausa / Inactivos</option>
          </select>

          <button
            className="btn-refresh"
            title="Recargar lista"
            onClick={() => loadUsers(page, filters)}
          >
            <IconRefresh size={17} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-container">
        {loading && users.length === 0 ? (
          <div className="loading-state">
            <IconRefresh size={32} className="spin-icon text-blue" />
            <span>Cargando directorio de usuarios y agentes...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <IconAlertCircle size={32} className="text-red" />
            <span>{error}</span>
            <button
              className="btn-secondary mt-2"
              onClick={() => loadUsers(page, filters)}
            >
              Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <IconUsers size={42} className="text-muted" />
            <h3>No se encontraron usuarios</h3>
            <p>Prueba ajustando los filtros de búsqueda o registra un nuevo usuario.</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Departamento</th>
                <th>Nivel / Capacidad</th>
                <th>Prioridades Asignadas</th>
                <th>Categorías Designadas</th>
                <th>Estado Agente</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  {/* Usuario */}
                  <td>
                    <div className="user-cell">
                      <div className={`avatar avatar-${u.role}`}>
                        {getUserInitials(u.name)}
                      </div>
                      <div className="user-meta">
                        <span className="user-fullname">{u.name}</span>
                        <span className="user-mail">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Rol */}
                  <td>
                    <span className={`role-pill role-${u.role}`}>
                      {formatRole(u.role)}
                    </span>
                  </td>

                  {/* Departamento */}
                  <td>
                    <span className="department-text">{u.department || '—'}</span>
                  </td>

                  {/* Nivel / Capacidad (Agentes) */}
                  <td>
                    {isAgent(u) ? (
                      <div className="agent-tier-box">
                        <span
                          className={`tier-tag tier-${u.support_agent?.tier_level || 1}`}
                        >
                          Tier {u.support_agent?.tier_level || 1} (
                          {tierLabel(u.support_agent?.tier_level)})
                        </span>
                        <span className="capacity-hint">
                          {u.assigned_tickets_count || 0} activos / máx{' '}
                          {u.support_agent?.max_active_tickets || 10}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">No aplica</span>
                    )}
                  </td>

                  {/* Prioridades Asignadas */}
                  <td>
                    {isAgent(u) ? (
                      <div className="priorities-wrapper">
                        {u.support_agent?.allowed_priorities?.length ? (
                          u.support_agent.allowed_priorities.map((p) => (
                            <span key={p} className={`prio-tag prio-${p}`}>
                              {priorityLabel(p)}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted text-xs">
                            Todas las prioridades
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>

                  {/* Categorías Designadas */}
                  <td>
                    {isAgent(u) ? (
                      <div className="categories-wrapper">
                        {u.support_agent?.categories?.length ? (
                          u.support_agent.categories.map((cat) => (
                            <span
                              key={cat.id}
                              className="category-tag"
                              title={cat.description}
                            >
                              {cat.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald font-semibold text-xs">
                            ★ Todas las categorías (General)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>

                  {/* Estado Agente */}
                  <td>
                    {isAgent(u) ? (
                      <div className="status-toggle-wrapper">
                        <button
                          className={`status-btn ${
                            u.support_agent?.is_active ? 'active' : 'paused'
                          }`}
                          title={
                            u.support_agent?.is_active
                              ? 'Clic para pausar disponibilidad'
                              : 'Clic para activar disponibilidad'
                          }
                          onClick={() => handleToggleActive(u)}
                        >
                          <span className="status-circle"></span>
                          <span>
                            {u.support_agent?.is_active ? 'Activo' : 'En Pausa'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="text-right">
                    <div className="actions-wrapper">
                      <button
                        className="action-btn edit-btn"
                        title="Editar datos y configuración de roles"
                        onClick={() => openEditModal(u)}
                      >
                        <IconEdit size={16} />
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          className="action-btn delete-btn"
                          title="Eliminar usuario"
                          onClick={() => confirmDeleteUser(u)}
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {pagination && pagination.last_page > 1 && (
        <div className="pagination-bar">
          <button
            className="page-btn"
            disabled={pagination.current_page <= 1}
            onClick={() => setPage(pagination.current_page - 1)}
          >
            ‹ Anterior
          </button>

          <span className="page-info">
            Página <b>{pagination.current_page}</b> de <b>{pagination.last_page}</b>{' '}
            ({pagination.total} usuarios)
          </span>

          <button
            className="page-btn"
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => setPage(pagination.current_page + 1)}
          >
            Siguiente ›
          </button>
        </div>
      )}

      {/* Modal Formulario Usuario & Roles */}
      {modalVisible && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title">
                  {isEditing
                    ? 'Editar Usuario y Roles de Agente'
                    : 'Nuevo Usuario del Sistema'}
                </h2>
                <span className="modal-subtitle">
                  {isEditing
                    ? 'Modifica la información y especialización asignada a este usuario.'
                    : 'Crea un nuevo usuario con roles y configuración de atención.'}
                </span>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <IconX size={20} />
              </button>
            </div>

            <form className="modal-form" onSubmit={submitForm}>
              {/* Pestañas internas */}
              <div className="modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveTab('account')}
                >
                  <IconUser size={16} />
                  <span>1. Cuenta y Perfil</span>
                </button>

                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
                  disabled={!isAgentRoleSelected}
                  onClick={() => setActiveTab('agent')}
                >
                  <IconHeadset size={16} />
                  <span>2. Especialización y Roles de Agente</span>
                  {!isAgentRoleSelected && (
                    <span className="tab-badge-disabled">Solo Soporte/Admin</span>
                  )}
                </button>
              </div>

              {/* TAB 1: Cuenta y Perfil */}
              {activeTab === 'account' && (
                <div className="tab-pane">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Nombre completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Ing. Roberto Mendoza"
                        className="input-field"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-group flex-1">
                      <label className="form-label">Correo electrónico *</label>
                      <input
                        type="email"
                        required
                        placeholder="usuario@helpdesk.com"
                        className="input-field"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">
                        Contraseña{' '}
                        {isEditing
                          ? '(Opcional, dejar vacía para conservar)'
                          : '*'}
                      </label>
                      <input
                        type="password"
                        required={!isEditing}
                        placeholder="Mínimo 6 caracteres"
                        className="input-field"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-group flex-1">
                      <label className="form-label">Rol en la plataforma *</label>
                      <select
                        required
                        className="select-field"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                      >
                        <option value="support">Soporte Técnico (Agente)</option>
                        <option value="admin">Administrador del Sistema</option>
                        <option value="teacher">Docente</option>
                        <option value="estudiante">Estudiante</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Departamento o Facultad</label>
                    <input
                      type="text"
                      placeholder="Ej. Soporte Tecnológico, Facultad de Ingeniería, etc."
                      className="input-field"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Roles de Agente y Atención de Tickets */}
              {activeTab === 'agent' && (
                <div className="tab-pane">
                  <div className="agent-info-banner">
                    <IconInfoCircle size={18} className="text-blue" />
                    <span>
                      Esta configuración determina la lógica de{' '}
                      <strong>asignación automática</strong> cuando ingresan tickets
                      desde Moodle o el Widget de soporte.
                    </span>
                  </div>

                  <div className="form-row mt-3">
                    {/* Nivel / Tier */}
                    <div className="form-group flex-1">
                      <label className="form-label">
                        Nivel de Atención (Tier Escalado)
                      </label>
                      <select
                        className="select-field"
                        value={formData.tier_level}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tier_level: Number(e.target.value),
                          })
                        }
                      >
                        <option value={1}>
                          Nivel 1 — Soporte Básico / Respuestas Frecuentes
                        </option>
                        <option value={2}>
                          Nivel 2 — Técnico Intermedio / Diagnóstico
                        </option>
                        <option value={3}>
                          Nivel 3 — Especialista / Administrador Crítico
                        </option>
                      </select>
                    </div>

                    {/* Límite de carga */}
                    <div className="form-group flex-1">
                      <label className="form-label">
                        Capacidad máxima de tickets concurrentes
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        className="input-field"
                        value={formData.max_active_tickets}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_active_tickets: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Nivel de Prioridad de Tickets que puede atender */}
                  <div className="form-group mt-3">
                    <label className="form-label">
                      Prioridades de ticket que puede atender:
                      <span className="hint-text">
                        (Si no marcas ninguna, atenderá cualquier prioridad)
                      </span>
                    </label>

                    <div className="checkbox-pills-grid">
                      <label className="checkbox-pill">
                        <input
                          type="checkbox"
                          checked={formData.allowed_priorities.includes('low')}
                          onChange={() => handlePriorityToggle('low')}
                        />
                        <span className="pill-badge prio-low">Baja (Low)</span>
                      </label>

                      <label className="checkbox-pill">
                        <input
                          type="checkbox"
                          checked={formData.allowed_priorities.includes('medium')}
                          onChange={() => handlePriorityToggle('medium')}
                        />
                        <span className="pill-badge prio-medium">Media (Medium)</span>
                      </label>

                      <label className="checkbox-pill">
                        <input
                          type="checkbox"
                          checked={formData.allowed_priorities.includes('high')}
                          onChange={() => handlePriorityToggle('high')}
                        />
                        <span className="pill-badge prio-high">Alta (High)</span>
                      </label>

                      <label className="checkbox-pill">
                        <input
                          type="checkbox"
                          checked={formData.allowed_priorities.includes('critical')}
                          onChange={() => handlePriorityToggle('critical')}
                        />
                        <span className="pill-badge prio-critical">
                          Crítica (Critical)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Categorías de Ticket que puede atender */}
                  <div className="form-group mt-3">
                    <div className="categories-header-row">
                      <label className="form-label">
                        Categorías de ticket designadas:
                        <span className="hint-text">
                          (Si no marcas ninguna, atenderá todas como agente comodín)
                        </span>
                      </label>
                      <div className="quick-select-btns">
                        <button
                          type="button"
                          className="btn-link-xs"
                          onClick={selectAllCategories}
                        >
                          Marcar todas
                        </button>
                        <span className="divider-xs">·</span>
                        <button
                          type="button"
                          className="btn-link-xs"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, category_ids: [] }))
                          }
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div className="categories-grid-selection">
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className={`category-check-item ${
                            formData.category_ids.includes(cat.id)
                              ? 'selected'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.category_ids.includes(cat.id)}
                            onChange={() => handleCategoryToggle(cat.id)}
                          />
                          <div className="cat-check-text">
                            <span className="cat-name">{cat.name}</span>
                            <span className="cat-desc">{cat.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Disponibilidad para Asignación */}
                  <div className="form-group mt-3">
                    <label className="toggle-availability-label">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                      />
                      <span className="toggle-label-text">
                        <strong>Agente Activo / Disponible para Asignación</strong>
                        <small>
                          Si se desmarca, el agente no recibirá nuevos tickets automáticos.
                        </small>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Mensaje de Error en el Formulario */}
              {formError && (
                <div className="form-error-alert mt-3">
                  <IconAlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Footer Modal */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? 'Guardando...'
                    : isEditing
                    ? 'Actualizar Usuario'
                    : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

