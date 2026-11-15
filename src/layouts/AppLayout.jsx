import React, { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  IconLogout,
  IconMenu2,
  IconX,
  IconHeadset,
  IconChevronRight,
  IconShieldLock,
  IconLifebuoy,
} from '@tabler/icons-react'
import { useAuthStore } from '../stores/authStore.js'
import { getNavigationForUser, getRouteContext } from '../config/navigation.js'
import { getRoleMeta, isAdmin } from '../utils/permissions.js'
import './AppLayout.css'

export default function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logoutUser = useAuthStore((state) => state.logoutUser)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Información visual y metadatos del rol del usuario logueado
  const roleMeta = useMemo(() => getRoleMeta(user), [user])
  const userIsAdmin = useMemo(() => isAdmin(user), [user])

  // Obtener estructura de navegación dinámica basada en permisos
  const navigationSections = useMemo(() => {
    return getNavigationForUser(user)
  }, [user])

  // Obtener contexto de la página activa para el Topbar y Breadcrumbs
  const routeContext = useMemo(() => {
    return getRouteContext(location.pathname)
  }, [location.pathname])

  // Iniciales del usuario para el avatar
  const userInitials = useMemo(() => {
    const name = user?.name || user?.nombre || ''
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }, [user?.name, user?.nombre])

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="app-shell">
      {/* Overlay móvil para sidebar */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={closeMobileMenu} />
      )}

      {/* Sidebar lateral dinámico */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <IconHeadset size={24} strokeWidth={2} />
            </div>
            <div className="brand-text">
              <span className="brand-title">Mesa Ayuda</span>
              <span className="brand-subtitle">UAGRM</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={closeMobileMenu} aria-label="Cerrar menú">
            <IconX size={20} />
          </button>
        </div>

        {/* Indicador de Modo de Operación / Rol */}
        <div className="sidebar-role-indicator">
          <div className={`role-indicator-pill ${roleMeta.badgeClass}`}>
            {userIsAdmin ? (
              <IconShieldLock size={14} strokeWidth={2.2} />
            ) : (
              <IconLifebuoy size={14} strokeWidth={2.2} />
            )}
            <span>{roleMeta.label.toUpperCase()}</span>
          </div>
        </div>

        {/* Navegación dinámica generada por secciones según permisos */}
        <nav className="sidebar-nav">
          {navigationSections.map((section) => (
            <div key={section.id} className="nav-group">
              <div className="nav-section-label">{section.sectionTitle}</div>
              <div className="nav-group-items">
                {section.items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'router-link-active' : ''}`
                      }
                      onClick={closeMobileMenu}
                      title={item.description}
                    >
                      <div className="nav-link-content">
                        <ItemIcon size={20} strokeWidth={1.8} className="nav-icon" />
                        <span>{item.title}</span>
                      </div>
                      <div className="nav-link-right">
                        {item.badge && (
                          <span className="nav-badge-pill">{item.badge}</span>
                        )}
                        <IconChevronRight size={16} className="nav-arrow" />
                      </div>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Usuario */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className={`user-avatar ${roleMeta.badgeClass}`}>
              {userInitials}
            </div>
            <div className="user-details">
              <span className="user-name" title={user?.name || user?.nombre || 'Usuario'}>
                {user?.name || user?.nombre || 'Usuario'}
              </span>
              <span className="user-role-badge" title={roleMeta.description}>
                {roleMeta.label}
              </span>
            </div>
          </div>

          <button
            className="btn-logout"
            title="Cerrar sesión"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
          >
            <IconLogout size={18} strokeWidth={1.8} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <div className="main-wrapper">
        {/* Barra superior Header */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <IconMenu2 size={22} />
            </button>
            <div className="page-context">
              <span className="context-breadcrumb">{routeContext.category}</span>
              <span className="context-divider">/</span>
              <span className="context-current">{routeContext.title}</span>
            </div>
          </div>

          <div className="topbar-right">

            <div className="topbar-user">
              <span className="topbar-greeting">
                Hola, <b>{(user?.name || user?.nombre || 'Usuario').split(' ')[0]}</b>
              </span>
            </div>
          </div>
        </header>

        {/* Vista activa */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
