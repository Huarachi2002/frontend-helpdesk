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
  IconUser,
  IconInfoCircle,
  IconAlertCircle,
  IconCheck,
  IconKey,
  IconSchool,
  IconFolders,
  IconClock,
  IconLock,
  IconEye,
  IconEyeOff,
  IconChevronLeft,
  IconChevronRight,
  IconToggleLeft,
  IconToggleRight,
  IconFilter,
  IconUserCheck,
  IconUserX,
  IconTicket,
  IconSitemap,
} from '@tabler/icons-react'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { Skeleton } from 'primereact/skeleton'
import { confirmDialog } from 'primereact/confirmdialog'
import { useUsersStore } from '../../stores/usersStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useOrgStructureStore } from '../../stores/orgStructureStore.js'
import { useToast } from '../../context/ToastContext.jsx'
import { createUserSchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import './UsersManagementView.css'

const defaultForm = {
  id: null,
  ci: '',
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  role: 'TECNICO',
  sesion: true,
  moodle_user_id: '',
  is_active: true,
  allowed_priorities: ['medium', 'high', 'critical'],
  category_ids: [],
  cargo_codigo: '',
}


export default function UsersManagementView() {
  const users = useUsersStore((state) => state.users)
  const pagination = useUsersStore((state) => state.pagination)
  const categories = useUsersStore((state) => state.categories)
  const loading = useUsersStore((state) => state.loading)
  const error = useUsersStore((state) => state.error)
  const cargos = useOrgStructureStore((state) => state.cargos)
  const fetchCargos = useOrgStructureStore((state) => state.fetchCargos)
  const fetchUsers = useUsersStore((state) => state.fetchUsers)
  const fetchCategories = useUsersStore((state) => state.fetchCategories)
  const saveUser = useUsersStore((state) => state.saveUser)
  const toggleStatus = useUsersStore((state) => state.toggleStatus)
  const deleteUserRecord = useUsersStore((state) => state.deleteUserRecord)

  const currentUser = useAuthStore((state) => state.user)
  const { showToast } = useToast()

  const [page, setPage] = useState(1)
  const [scopeFilter, setScopeFilter] = useState('all') // 'all' | 'staff' | 'campus'
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    is_active: '',
  })

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formData, setFormData] = useState({ ...defaultForm })
  const [showPassword, setShowPassword] = useState(false)
  const [modalCatSearch, setModalCatSearch] = useState('')

  const loadUsers = useCallback(
    (targetPage = page, currentFilters = filters) => {
      const params = { page: targetPage }
      if (currentFilters.search) params.search = currentFilters.search
      if (currentFilters.role) params.role = currentFilters.role
      if (currentFilters.is_active !== '') params.is_active = currentFilters.is_active
      fetchUsers(params).catch(() => {})
    },
    [fetchUsers, page, filters]
  )

  useEffect(() => {
    loadUsers(page, filters)
    fetchCategories().catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadUsers(page, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Métricas rápidas
  const totalUsersCount = pagination?.total ?? users.length
  const tecnicosCount = useMemo(
    () => users.filter((u) => (u.rol?.nombre || u.role) === 'TECNICO' || u.role === 'support').length,
    [users]
  )
  const directoresCount = useMemo(
    () => users.filter((u) => (u.rol?.nombre || u.role) === 'DIRECTOR' || u.role === 'admin').length,
    [users]
  )
  const activeCount = useMemo(
    () => users.filter((u) => u.activo ?? u.is_active).length,
    [users]
  )

  const inInternalRole = (role) => {
    const r = String(role || '').toUpperCase()
    return r === 'DIRECTOR' || r === 'TECNICO' || r === 'ADMIN' || r === 'SUPPORT'
  }

  // Filtrado de scope (Pestañas rápidas: Todos / Equipo Soporte / Campus)
  const displayedUsers = useMemo(() => {
    if (scopeFilter === 'staff') {
      return users.filter((u) => inInternalRole(u.rol?.nombre || u.role))
    }
    if (scopeFilter === 'campus') {
      return users.filter((u) => !inInternalRole(u.rol?.nombre || u.role))
    }
    return users
  }, [users, scopeFilter])

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

  const resetFilters = () => {
    const reset = { search: '', role: '', is_active: '' }
    setFilters(reset)
    setScopeFilter('all')
    setPage(1)
    loadUsers(1, reset)
  }

  const openCreateModal = () => {
    fetchCategories().catch(() => {})
    fetchCargos().catch(() => {})
    setIsEditing(false)
    setFormError('')
    setFieldErrors({})
    setActiveTab('account')
    setShowPassword(false)
    setModalCatSearch('')
    setFormData({
      ...defaultForm,
      category_ids: categories.map((c) => c.id),
    })
    setModalVisible(true)
  }

  const openEditModal = (u) => {
    fetchCategories().catch(() => {})
    fetchCargos().catch(() => {})
    setIsEditing(true)
    setFormError('')
    setFieldErrors({})
    setActiveTab('account')
    setShowPassword(false)
    setModalCatSearch('')

    const rolStr = u.rol?.nombre || (u.role === 'admin' ? 'DIRECTOR' : u.role === 'support' ? 'TECNICO' : 'ESTUDIANTE')

    // Prioridades asignadas
    const prioCodes = u.prioridades
      ? u.prioridades.map((p) => (p.codigo || '').toLowerCase())
      : u.support_agent?.allowed_priorities || ['medium', 'high', 'critical']

    // Categorías asignadas
    const catIds = u.categorias
      ? u.categorias.map((c) => c.id)
      : u.support_agent?.categories ? u.support_agent.categories.map((c) => c.id) : []

    setFormData({
      id: u.ci || u.id,
      ci: u.ci || u.id || '',
      nombre: u.nombre || (u.name ? u.name.split(' ')[0] : ''),
      apellido: u.apellido || (u.name ? u.name.split(' ').slice(1).join(' ') : ''),
      correo: u.correo || u.email || '',
      password: '',
      role: rolStr,
      sesion: Boolean(u.sesion ?? inInternalRole(rolStr)),
      moodle_user_id: u.moodle_user_id || '',
      is_active: Boolean(u.activo ?? u.is_active ?? true),
      allowed_priorities: prioCodes,
      category_ids: catIds,
      cargo_codigo: u.cargo_codigo || '',
    })

    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  const handleRoleChange = (e) => {
    const nextRole = e.target.value
    const isInternal = inInternalRole(nextRole)
    setFormData((prev) => ({
      ...prev,
      role: nextRole,
      sesion: isInternal, // Habilitar sesión web por defecto para roles internos
      cargo_codigo: isInternal ? prev.cargo_codigo : '', // Solo el personal ocupa un cargo
    }))
    clearFieldError('role')
    if (!isInternal) {
      clearFieldError('cargo_codigo')
    }
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

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const submitForm = async (e) => {
    e.preventDefault()
    const schema = createUserSchema({ isEditing })
    const validation = validateSchema(schema, formData)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setFormError(validation.firstError)
      const accountFields = ['nombre', 'apellido', 'correo', 'password', 'role', 'moodle_user_id', 'cargo_codigo']
      if (accountFields.some((f) => validation.fieldErrors[f])) {
        setActiveTab('account')
      }
      return
    }

    setFormSubmitting(true)
    setFormError('')
    setFieldErrors({})

    try {
      const parsed = validation.data
      const payload = {
        id: parsed.id ?? null,
        ci: parsed.ci,
        nombre: parsed.nombre,
        apellido: parsed.apellido || null,
        name: `${parsed.nombre} ${parsed.apellido || ''}`.trim(),
        correo: parsed.correo,
        email: parsed.correo,
        role: parsed.role,
        sesion: parsed.sesion,
        moodle_user_id: parsed.moodle_user_id,
        is_active: parsed.is_active,
        allowed_priorities: parsed.allowed_priorities,
        category_ids: parsed.category_ids,
        cargo_codigo: inInternalRole(parsed.role) ? parsed.cargo_codigo || null : null,
      }

      if (parsed.password) {
        payload.password = parsed.password
      }

      const res = await saveUser(payload)
      showToast({
        severity: 'success',
        summary: isEditing ? 'Usuario Actualizado' : 'Usuario Creado',
        detail: res.message || 'Operación completada con éxito en la base de datos.',
        life: 3500,
      })
      closeModal()
      loadUsers(page, filters)
    } catch (err) {
      const apiErr = extractApiValidationErrors(err, 'Error al guardar el usuario en el sistema.')
      if (apiErr.fieldErrors.email && !apiErr.fieldErrors.correo) {
        apiErr.fieldErrors.correo = apiErr.fieldErrors.email
      }
      setFieldErrors(apiErr.fieldErrors)
      setFormError(apiErr.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleActive = async (u) => {
    try {
      const res = await toggleStatus(u.id)
      showToast({
        severity: 'info',
        summary: 'Estado de Cuenta Actualizado',
        detail: res.message || `Disponibilidad de ${u.nombre || u.name} modificada.`,
        life: 3000,
      })
      loadUsers(page, filters)
    } catch (err) {
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'No se pudo actualizar el estado.',
        life: 4000,
      })
    }
  }

  const confirmDeleteUser = (u) => {
    const isSelf = currentUser?.id === u.id
    if (isSelf) {
      showToast({
        severity: 'warn',
        summary: 'Operación no permitida',
        detail: 'No puedes eliminar tu propia cuenta en sesión activa.',
        life: 3500,
      })
      return
    }

    const hasTickets = (u.assigned_tickets_count > 0) || (u.created_tickets_count > 0)

    confirmDialog({
      header: 'Confirmar Eliminación de Usuario',
      message: (
        <div className="confirm-delete-body">
          <p>
            ¿Estás seguro de que deseas eliminar permanentemente al usuario{' '}
            <strong>{u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.name || u.nombre}</strong> (
            <em>{u.correo || u.email}</em>)?
          </p>
          {hasTickets && (
            <div className="alert-delete-warning">
              <IconAlertCircle size={18} />
              <span>
                Este usuario tiene tickets asociados. Si la eliminación es rechazada por integridad referencial,
                se recomienda cambiar su estado a <strong>Inactivo</strong> para suspender el acceso.
              </span>
            </div>
          )}
        </div>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar Cuenta',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteUserRecord(u.id)
          showToast({
            severity: 'success',
            summary: 'Usuario Eliminado',
            detail: 'Registro eliminado correctamente de la base de datos.',
            life: 3000,
          })
          loadUsers(page, filters)
        } catch (err) {
          showToast({
            severity: 'error',
            summary: 'No se pudo eliminar',
            detail:
              err.response?.data?.message ||
              'El usuario cuenta con incidencias históricas vinculadas. Considera desactivar su cuenta.',
            life: 4500,
          })
        }
      },
    })
  }

  const formatRole = (r) => {
    const map = {
      DIRECTOR: 'Director (Admin)',
      TECNICO: 'Técnico de Soporte',
      DOCENTE: 'Docente Moodle',
      ESTUDIANTE: 'Estudiante Campus',
      VISITANTE: 'Visitante Externo',
      admin: 'Director (Admin)',
      support: 'Técnico de Soporte',
      teacher: 'Docente Moodle',
      estudiante: 'Estudiante Campus',
    }
    return map[r] ?? r
  }

  const priorityLabel = (p) => {
    const map = {
      low: 'Baja (72h)',
      medium: 'Media (48h)',
      high: 'Alta (24h)',
      critical: 'Crítica (4h)',
    }
    return map[p?.toLowerCase?.()] ?? p
  }

  // Filtrado de categorías dentro del modal
  const filteredModalCategories = useMemo(() => {
    if (!modalCatSearch.trim()) return categories
    const q = modalCatSearch.toLowerCase()
    return categories.filter(
      (c) =>
        (c.nombre || c.name || '').toLowerCase().includes(q) ||
        (c.descripcion || c.description || '').toLowerCase().includes(q)
    )
  }, [categories, modalCatSearch])

  return (
    <div className="users-view">
      {/* Encabezado Principal */}
      <div className="page-header">
        <div className="header-titles">
          <div className="title-with-badge">
            <h1 className="page-title">Gestión de Usuarios y Roles Institucionales</h1>
          </div>
          <p className="page-subtitle">
            Administra cuentas de personal técnico (Soporte y Dirección) y usuarios del campus (Docentes, Estudiantes y Visitantes).
          </p>
        </div>

        <div className="header-actions">
          <Button
            label="Actualizar"
            severity="secondary"
            outlined
            size="small"
            loading={loading}
            onClick={() => loadUsers(page, filters)}
            icon={<IconRefresh size={16} />}
          />
          <button type="button" className="btn-primary" onClick={openCreateModal}>
            <IconUserPlus size={17} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap bg-blue-subtle">
            <IconUsers size={22} className="text-blue" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Usuarios</span>
            <span className="metric-val">{totalUsersCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-purple-subtle">
            <IconHeadset size={22} className="text-purple" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Técnicos de Soporte</span>
            <span className="metric-val text-purple">{tecnicosCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-amber-subtle">
            <IconShieldCheck size={22} className="text-amber" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Dirección & Admin</span>
            <span className="metric-val text-amber">{directoresCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap bg-emerald-subtle">
            <IconCheck size={22} className="text-emerald" />
          </div>
          <div className="metric-info">
            <span className="metric-label">Cuentas Activas</span>
            <span className="metric-val text-emerald">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Pestañas Segmentadas de Alcance (Ergonomía Superior) */}
      <div className="segmented-scope-bar">
        <div className="scope-pills">
          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setScopeFilter('all')}
          >
            <IconUsers size={16} />
            <span>Todos los Usuarios</span>
            <span className="scope-count">{totalUsersCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'staff' ? 'active' : ''}`}
            onClick={() => setScopeFilter('staff')}
          >
            <IconHeadset size={16} />
            <span>Equipo de Soporte & Dirección</span>
            <span className="scope-count">{tecnicosCount + directoresCount}</span>
          </button>

          <button
            type="button"
            className={`scope-pill ${scopeFilter === 'campus' ? 'active' : ''}`}
            onClick={() => setScopeFilter('campus')}
          >
            <IconSchool size={16} />
            <span>Comunidad Campus Moodle</span>
            <span className="scope-count">
              {Math.max(0, totalUsersCount - (tecnicosCount + directoresCount))}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="filters-card">
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, apellidos o correo institucional..."
            value={filters.search}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          {filters.search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                const next = { ...filters, search: '' }
                setFilters(next)
                loadUsers(1, next)
              }}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-group">
          <div className="filter-item">
            <span className="filter-label">Rol:</span>
            <select
              name="role"
              value={filters.role}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todos los roles</option>
              <option value="TECNICO">Técnico de Soporte</option>
              <option value="DIRECTOR">Director / Admin</option>
              <option value="DOCENTE">Docente Moodle</option>
              <option value="ESTUDIANTE">Estudiante Moodle</option>
              <option value="VISITANTE">Visitante</option>
            </select>
          </div>

          <div className="filter-item">
            <span className="filter-label">Estado:</span>
            <select
              name="is_active"
              value={filters.is_active}
              className="custom-select"
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              <option value="true">Solo Activos</option>
              <option value="false">Solo Inactivos</option>
            </select>
          </div>

          {(filters.search || filters.role || filters.is_active !== '' || scopeFilter !== 'all') && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={resetFilters}
            >
              <IconX size={14} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="table-card">
        {loading && users.length === 0 ? (
          <div className="loading-state">
            <Skeleton height="3rem" className="mb-2" />
            <Skeleton height="3.5rem" className="mb-2" />
            <Skeleton height="3.5rem" className="mb-2" />
            <Skeleton height="3.5rem" />
          </div>
        ) : error ? (
          <div className="error-state">
            <IconAlertCircle size={36} className="text-red" />
            <h3>Error al cargar los usuarios</h3>
            <p>{error}</p>
            <Button
              label="Reintentar"
              severity="secondary"
              size="small"
              onClick={() => loadUsers(page, filters)}
              className="mt-2"
            />
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="empty-state">
            <IconUsers size={46} className="text-muted" strokeWidth={1.5} />
            <h3>No se encontraron usuarios</h3>
            <p>
              {filters.search || filters.role || filters.is_active !== '' || scopeFilter !== 'all'
                ? 'Ningún usuario coincide con los criterios de filtrado seleccionados.'
                : 'Aún no se han registrado usuarios en el sistema.'}
            </p>
            {filters.search || filters.role || filters.is_active !== '' || scopeFilter !== 'all' ? (
              <Button
                label="Restablecer filtros"
                severity="primary"
                outlined
                size="small"
                onClick={resetFilters}
              />
            ) : (
              <button type="button" className="btn-primary" onClick={openCreateModal}>
                <IconUserPlus size={16} />
                <span>Registrar Primer Usuario</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: '280px' }}>Usuario</th>
                  <th style={{ width: '200px' }}>Rol Institucional</th>
                  <th style={{ width: '130px' }}>ID Moodle</th>
                  <th style={{ width: '240px' }}>Prioridades & Categorías</th>
                  <th style={{ width: '120px' }}>Disponibilidad</th>
                  <th className="text-right" style={{ width: '110px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const rolNombre = u.rol?.nombre || (u.role === 'admin' ? 'DIRECTOR' : u.role === 'support' ? 'TECNICO' : 'ESTUDIANTE')
                  const isInterno = inInternalRole(rolNombre)
                  const isActive = Boolean(u.activo ?? u.is_active ?? true)
                  const isCurrent = currentUser?.id === u.id
                  const initialLetter = (u.nombre || u.name || 'U').charAt(0).toUpperCase()

                  return (
                    <tr key={u.id} className={!isActive ? 'row-inactive' : ''}>
                      {/* Usuario */}
                      <td>
                        <div className="user-profile-cell">
                          <div className={`user-avatar avatar-${rolNombre.toLowerCase()}`}>
                            {initialLetter}
                          </div>
                          <div className="user-text-info">
                            <div className="user-name-line">
                              <span className="user-fullname">
                                {u.nombre && u.apellido
                                  ? `${u.nombre} ${u.apellido}`
                                  : u.name || u.nombre || 'Sin nombre'}
                              </span>
                              {isCurrent && (
                                <span className="current-user-tag" title="Tu cuenta en sesión actual">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="user-email">
                              {u.ci ? `CI: ${u.ci} · ` : ''}{u.correo || u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rol & Frontera */}
                      <td>
                        <div className="role-frontera-cell">
                          <span className={`role-badge role-${rolNombre.toLowerCase()}`}>
                            {formatRole(rolNombre)}
                          </span>
                          {isInterno && (
                            u.cargo ? (
                              <span className="cargo-line" title={`${u.cargo.codigo} · ${u.cargo.seccion}`}>
                                <IconSitemap size={12} />
                                <span>{u.cargo.nombre}</span>
                              </span>
                            ) : (
                              <span className="cargo-line is-missing" title="Asigna un cargo en la Estructura Organizacional">
                                <IconAlertCircle size={12} />
                                <span>Sin cargo asignado</span>
                              </span>
                            )
                          )}
                          <span className={`badge-sesion ${isInterno ? 'internal' : 'external'}`}>
                            {isInterno ? (
                              <>
                                <IconKey size={12} />
                                <span>Sesión Web (Consola)</span>
                              </>
                            ) : (
                              <>
                                <IconSchool size={12} />
                                <span>Campus Moodle</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* ID Moodle */}
                      <td>
                        {u.moodle_user_id ? (
                          <span className="moodle-chip" title={`Usuario ID #${u.moodle_user_id} sincronizado con Moodle`}>
                            <IconSchool size={13} />
                            <span>mdl #{u.moodle_user_id}</span>
                          </span>
                        ) : (
                          <span className="text-subtle text-xs">—</span>
                        )}
                      </td>

                      {/* Competencias Técnicas (Prioridades & Categorías) */}
                      <td>
                        {isInterno ? (
                          <div className="competencies-stack">
                            {/* Prioridades */}
                            <div className="priorities-row">
                              {u.prioridades && u.prioridades.length > 0 ? (
                                u.prioridades.map((p) => (
                                  <span
                                    key={p.id}
                                    className={`prio-chip prio-${(p.codigo || '').toLowerCase()}`}
                                    title={`SLA: ${p.sla_horas_resolucion ? `${p.sla_horas_resolucion}h` : 'N/D'}`}
                                  >
                                    {p.nombre || p.codigo}
                                  </span>
                                ))
                              ) : u.support_agent?.allowed_priorities?.length ? (
                                u.support_agent.allowed_priorities.map((p) => (
                                  <span key={p} className={`prio-chip prio-${p}`}>
                                    {priorityLabel(p)}
                                  </span>
                                ))
                              ) : (
                                <span className="prio-chip all">Todas las prioridades</span>
                              )}
                            </div>

                            {/* Categorías */}
                            <div className="categories-row">
                              {u.categorias && u.categorias.length > 0 ? (
                                <>
                                  {u.categorias.slice(0, 2).map((c) => (
                                    <span key={c.id} className="cat-chip" title={c.descripcion || ''}>
                                      {c.nombre || c.name}
                                    </span>
                                  ))}
                                  {u.categorias.length > 2 && (
                                    <span
                                      className="cat-chip-more"
                                      title={u.categorias.slice(2).map((c) => c.nombre || c.name).join(', ')}
                                    >
                                      +{u.categorias.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : u.support_agent?.categories?.length ? (
                                <>
                                  {u.support_agent.categories.slice(0, 2).map((c) => (
                                    <span key={c.id} className="cat-chip">
                                      {c.name || c.nombre}
                                    </span>
                                  ))}
                                  {u.support_agent.categories.length > 2 && (
                                    <span className="cat-chip-more">
                                      +{u.support_agent.categories.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="cat-chip-wildcard">Comodín (Todas las temáticas)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="client-competency-pill">
                            <span className="client-badge">Usuario Solicitante</span>
                          </div>
                        )}
                      </td>

                      {/* Disponibilidad (Toggle Switch) */}
                      <td>
                        <button
                          type="button"
                          className={`switch-status-btn ${isActive ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleActive(u)}
                          title={isActive ? 'Clic para desactivar acceso' : 'Clic para habilitar cuenta'}
                        >
                          {isActive ? (
                            <>
                              <IconToggleRight size={22} className="switch-icon text-emerald" />
                              <span className="switch-text active">Activo</span>
                            </>
                          ) : (
                            <>
                              <IconToggleLeft size={22} className="switch-icon text-slate" />
                              <span className="switch-text inactive">Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            className="btn-action edit"
                            title="Editar usuario y competencias"
                            onClick={() => openEditModal(u)}
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-action delete"
                            title={isCurrent ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                            disabled={isCurrent}
                            onClick={() => confirmDeleteUser(u)}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {pagination && pagination.total > 0 && (
          <div className="pagination-footer">
            <span className="pagination-info">
              Mostrando página <b>{pagination.current_page}</b> de <b>{pagination.last_page}</b> (
              <b>{pagination.total}</b> usuarios registrados)
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                disabled={pagination.current_page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <IconChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                className="btn-page"
                disabled={pagination.current_page >= pagination.last_page || loading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <span>Siguiente</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Formulario Profesional */}
      {modalVisible && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="modal-container">
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-icon-wrap">
                <IconUser size={22} className="text-blue" />
              </div>
              <div className="modal-header-text">
                <h2 className="modal-title">
                  {isEditing ? `Editar Usuario #${formData.id}` : 'Registrar Nuevo Usuario'}
                </h2>
                <p className="modal-subtitle">
                  {isEditing
                    ? 'Actualiza los datos personales, rol institucional y competencias de soporte técnico.'
                    : 'Completa la información institucional y designa las competencias correspondientes.'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Cerrar modal"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={submitForm} className="modal-form-content" noValidate>
              {/* Pestañas de Navegación del Modal */}
              <div className="modal-nav-tabs">
                <button
                  type="button"
                  className={`modal-tab ${activeTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveTab('account')}
                >
                  <IconUser size={16} />
                  <span>1. Cuenta & Rol Institucional</span>
                </button>

                <button
                  type="button"
                  className={`modal-tab ${activeTab === 'agent' ? 'active' : ''} ${
                    !inInternalRole(formData.role) ? 'tab-disabled' : ''
                  }`}
                  onClick={() => {
                    if (inInternalRole(formData.role)) {
                      setActiveTab('agent')
                    }
                  }}
                  title={
                    !inInternalRole(formData.role)
                      ? 'Las competencias técnicas solo aplican a Personal de Soporte Técnico y Dirección.'
                      : ''
                  }
                >
                  <IconHeadset size={16} />
                  <span>2. Competencias Técnicas & SLAs</span>
                  {inInternalRole(formData.role) ? (
                    <span className="tab-pill-badge active">Soporte</span>
                  ) : (
                    <span className="tab-pill-badge muted">Solo Técnicos</span>
                  )}
                </button>
              </div>

              {/* Cuerpo del Formulario */}
              <div className="modal-scrollable-body">
                {formError && (
                  <div className="form-error-banner">
                    <IconAlertCircle size={20} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* TAB 1: DATOS DE CUENTA */}
                {activeTab === 'account' && (
                  <div className="tab-section">
                    <div className="form-field mb-3">
                      <label className="field-label">
                        Cédula de Identidad (CI) <span className="required-star">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={30}
                        placeholder="Ej. 1000011 o 8451234-1A"
                        className={`field-input ${fieldErrors.ci ? 'input-invalid' : ''}`}
                        aria-invalid={Boolean(fieldErrors.ci)}
                        value={formData.ci}
                        onChange={(e) => {
                          setFormData({ ...formData, ci: e.target.value })
                          clearFieldError('ci')
                        }}
                      />
                      {fieldErrors.ci && (
                        <span className="field-error-text">{fieldErrors.ci}</span>
                      )}
                    </div>

                    <div className="form-grid-2">
                      <div className="form-field">
                        <label className="field-label">
                          Nombre(s) <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Ej. Carlos Fernando"
                          className={`field-input ${fieldErrors.nombre ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.nombre)}
                          value={formData.nombre}
                          onChange={(e) => {
                            setFormData({ ...formData, nombre: e.target.value })
                            clearFieldError('nombre')
                          }}
                        />
                        {fieldErrors.nombre && (
                          <span className="field-error-text">{fieldErrors.nombre}</span>
                        )}
                      </div>

                      <div className="form-field">
                        <label className="field-label">Apellidos</label>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Ej. Morales Vega"
                          className={`field-input ${fieldErrors.apellido ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.apellido)}
                          value={formData.apellido}
                          onChange={(e) => {
                            setFormData({ ...formData, apellido: e.target.value })
                            clearFieldError('apellido')
                          }}
                        />
                        {fieldErrors.apellido && (
                          <span className="field-error-text">{fieldErrors.apellido}</span>
                        )}
                      </div>
                    </div>

                    <div className="form-grid-2 mt-3">
                      <div className="form-field">
                        <label className="field-label">
                          Correo Institucional <span className="required-star">*</span>
                        </label>
                        <input
                          type="email"
                          maxLength={150}
                          placeholder="usuario@campus.edu"
                          className={`field-input ${fieldErrors.correo ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.correo)}
                          value={formData.correo}
                          onChange={(e) => {
                            setFormData({ ...formData, correo: e.target.value })
                            clearFieldError('correo')
                          }}
                        />
                        {fieldErrors.correo && (
                          <span className="field-error-text">{fieldErrors.correo}</span>
                        )}
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          Contraseña {isEditing ? <span className="optional-text">(Opcional)</span> : <span className="required-star">*</span>}
                        </label>
                        <div className="password-input-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={isEditing ? 'Sin cambios (dejar vacío)' : 'Mínimo 6 caracteres'}
                            className={`field-input pr-10 ${fieldErrors.password ? 'input-invalid' : ''}`}
                            aria-invalid={Boolean(fieldErrors.password)}
                            value={formData.password}
                            onChange={(e) => {
                              setFormData({ ...formData, password: e.target.value })
                              clearFieldError('password')
                            }}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Ver u ocultar contraseña"
                          >
                            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <span className="field-error-text">{fieldErrors.password}</span>
                        )}
                      </div>
                    </div>

                    <div className="form-grid-2 mt-3">
                      <div className="form-field">
                        <label className="field-label">
                          Rol Institucional <span className="required-star">*</span>
                        </label>
                        <select
                          className={`field-select ${fieldErrors.role ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.role)}
                          value={formData.role}
                          onChange={handleRoleChange}
                        >
                          <option value="TECNICO">TECNICO — Soporte Técnico & Resolución (Interno)</option>
                          <option value="DIRECTOR">DIRECTOR — Dirección & Administración General (Interno)</option>
                          <option value="DOCENTE">DOCENTE — Profesor / Académico Moodle (Externo)</option>
                          <option value="ESTUDIANTE">ESTUDIANTE — Alumno Matriculado (Externo)</option>
                          <option value="VISITANTE">VISITANTE — Visitante Externo / Comunidad</option>
                        </select>
                        {fieldErrors.role && (
                          <span className="field-error-text">{fieldErrors.role}</span>
                        )}
                        <span className="field-hint">
                          Define el nivel de acceso en la plataforma y el flujo de asignación.
                        </span>
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          ID de Usuario Moodle <span className="optional-text">(mdl_user.id)</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          placeholder="Ej. 1042 (Vacío si no está en Moodle)"
                          className={`field-input ${fieldErrors.moodle_user_id ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.moodle_user_id)}
                          value={formData.moodle_user_id}
                          onChange={(e) => {
                            setFormData({ ...formData, moodle_user_id: e.target.value })
                            clearFieldError('moodle_user_id')
                          }}
                        />
                        {fieldErrors.moodle_user_id && (
                          <span className="field-error-text">{fieldErrors.moodle_user_id}</span>
                        )}
                        <span className="field-hint">
                          Enlaza la cuenta con la base de datos de usuarios de la plataforma académica.
                        </span>
                      </div>
                    </div>

                    {inInternalRole(formData.role) && (
                      <div className="form-field mt-3">
                        <label className="field-label">
                          Cargo en la Estructura Organizacional <span className="required-star">*</span>
                        </label>
                        <select
                          className={`field-select ${fieldErrors.cargo_codigo ? 'input-invalid' : ''}`}
                          aria-invalid={Boolean(fieldErrors.cargo_codigo)}
                          value={formData.cargo_codigo}
                          onChange={(e) => {
                            setFormData({ ...formData, cargo_codigo: e.target.value })
                            clearFieldError('cargo_codigo')
                          }}
                        >
                          <option value="">— Selecciona un cargo —</option>
                          {[...new Set(cargos.map((c) => c.nivel))].sort((a, b) => a - b).map((nivel) => {
                            const options = cargos.filter((c) => c.nivel === nivel && c.activo)
                            if (options.length === 0) return null
                            return (
                              <optgroup key={nivel} label={`Nivel ${nivel}`}>
                                {options.map((c) => (
                                  <option key={c.codigo} value={c.codigo}>
                                    {c.codigo} — {c.nombre}
                                  </option>
                                ))}
                              </optgroup>
                            )
                          })}
                        </select>
                        {fieldErrors.cargo_codigo && (
                          <span className="field-error-text">{fieldErrors.cargo_codigo}</span>
                        )}
                        <span className="field-hint">
                          Define el nivel jerárquico del usuario para el relevamiento de tickets. Sugerido: Jefe/a y Coordinadores como DIRECTOR; cargos operativos como TECNICO.
                        </span>
                      </div>
                    )}

                    {/* Cards de Configuración de Acceso y Sesión */}
                    <div className="access-cards-group mt-4">
                      {/* Card Sesión Web */}
                      <label className={`access-config-card ${formData.sesion ? 'checked' : ''}`}>
                        <div className="access-card-left">
                          <input
                            type="checkbox"
                            checked={formData.sesion}
                            onChange={(e) =>
                              setFormData({ ...formData, sesion: e.target.checked })
                            }
                          />
                        </div>
                        <div className="access-card-info">
                          <div className="access-card-title">
                            <IconKey size={16} className="text-blue" />
                            <span>Sesión Web Habilitada (Acceso a Consola)</span>
                          </div>
                          <p className="access-card-desc">
                            Permite autenticarse en este portal web.
                          </p>
                        </div>
                      </label>

                      {/* Card Cuenta Activa */}
                      <label className={`access-config-card ${formData.is_active ? 'checked' : ''}`}>
                        <div className="access-card-left">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) =>
                              setFormData({ ...formData, is_active: e.target.checked })
                            }
                          />
                        </div>
                        <div className="access-card-info">
                          <div className="access-card-title">
                            <IconCheck size={16} className="text-emerald" />
                            <span>Cuenta Activa en el Sistema</span>
                          </div>
                          <p className="access-card-desc">
                            Si se desmarca, el usuario no podrá iniciar sesión ni recibir tickets automáticos.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 2: COMPETENCIAS TÉCNICAS */}
                {activeTab === 'agent' && (
                  <div className="tab-section">

                    {/* Niveles de Prioridad */}
                    <div className="form-group-block mt-4">
                      <div className="block-header">
                        <label className="block-title">
                          <IconClock size={16} className="text-amber" />
                          <span>Niveles de Prioridad SLA que puede atender:</span>
                        </label>
                        <span className="block-subtitle">
                          Marca los niveles de impacto y tiempo de respuesta autorizados.
                        </span>
                      </div>

                      <div className="priorities-picker-grid">
                        <label
                          className={`priority-card prio-low ${
                            formData.allowed_priorities.includes('low') ? 'selected' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowed_priorities.includes('low')}
                            onChange={() => handlePriorityToggle('low')}
                          />
                          <div className="priority-card-inner">
                            <span className="priority-card-name">Baja</span>
                            <span className="priority-card-sla">SLA: 72 horas</span>
                          </div>
                        </label>

                        <label
                          className={`priority-card prio-medium ${
                            formData.allowed_priorities.includes('medium') ? 'selected' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowed_priorities.includes('medium')}
                            onChange={() => handlePriorityToggle('medium')}
                          />
                          <div className="priority-card-inner">
                            <span className="priority-card-name">Media</span>
                            <span className="priority-card-sla">SLA: 48 horas</span>
                          </div>
                        </label>

                        <label
                          className={`priority-card prio-high ${
                            formData.allowed_priorities.includes('high') ? 'selected' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowed_priorities.includes('high')}
                            onChange={() => handlePriorityToggle('high')}
                          />
                          <div className="priority-card-inner">
                            <span className="priority-card-name">Alta</span>
                            <span className="priority-card-sla">SLA: 24 horas</span>
                          </div>
                        </label>

                        <label
                          className={`priority-card prio-critical ${
                            formData.allowed_priorities.includes('critical') ? 'selected' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowed_priorities.includes('critical')}
                            onChange={() => handlePriorityToggle('critical')}
                          />
                          <div className="priority-card-inner">
                            <span className="priority-card-name">Crítica</span>
                            <span className="priority-card-sla">SLA: 4 horas</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Categorías Asignadas */}
                    <div className="form-group-block mt-4">
                      <div className="categories-header-toolbar">
                        <div>
                          <label className="block-title">
                            <IconFolders size={16} className="text-blue" />
                            <span>Categorías Temáticas Asignadas:</span>
                          </label>
                          <span className="block-subtitle">
                            {formData.category_ids.length === 0
                              ? 'Técnico Comodín: Al no tener categorías específicas, podrá atender cualquier temática.'
                              : `${formData.category_ids.length} categoría(s) especializada(s) seleccionada(s).`}
                          </span>
                        </div>

                        <div className="quick-action-links">
                          <button
                            type="button"
                            className="btn-link"
                            onClick={selectAllCategories}
                          >
                            Marcar todas
                          </button>
                          <span className="link-divider">·</span>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, category_ids: [] }))
                            }
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>

                      {/* Buscador de categorías en el modal */}
                      {categories.length > 4 && (
                        <div className="category-search-bar mt-2 mb-2">
                          <IconSearch size={15} />
                          <input
                            type="text"
                            placeholder="Buscar temática en el catálogo..."
                            value={modalCatSearch}
                            onChange={(e) => setModalCatSearch(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="categories-selection-container">
                        {categories.length === 0 ? (
                          <div className="empty-categories-note">
                            <IconFolders size={24} className="text-muted" />
                            <span>No hay categorías configuradas en el catálogo maestro.</span>
                          </div>
                        ) : (
                          <div className="categories-grid-cards">
                            {filteredModalCategories.map((cat) => {
                              const isChecked = formData.category_ids.includes(cat.id)
                              return (
                                <label
                                  key={cat.id}
                                  className={`category-item-card ${isChecked ? 'selected' : ''} ${
                                    cat.activo === false ? 'cat-inactive' : ''
                                  }`}
                                >
                                  <div className="cat-card-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleCategoryToggle(cat.id)}
                                    />
                                  </div>
                                  <div className="cat-card-content">
                                    <div className="cat-card-header">
                                      <span className="cat-title">{cat.nombre || cat.name}</span>
                                      {cat.activo === false && (
                                        <span className="cat-inactive-tag">En pausa</span>
                                      )}
                                    </div>
                                    <p className="cat-description">
                                      {cat.descripcion || cat.description || 'Sin descripción detallada'}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <Button
                  type="button"
                  label="Cancelar"
                  severity="secondary"
                  outlined
                  disabled={formSubmitting}
                  onClick={closeModal}
                />
                <Button
                  type="submit"
                  label={
                    formSubmitting
                      ? 'Guardando...'
                      : isEditing
                      ? 'Guardar Cambios'
                      : 'Crear Usuario'
                  }
                  severity="primary"
                  loading={formSubmitting}
                  icon={<IconCheck size={16} />}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
