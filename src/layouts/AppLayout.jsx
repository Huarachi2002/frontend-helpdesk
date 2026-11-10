import React, { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconTicket,
  IconRobot,
  IconChartBar,
  IconLogout,
  IconMenu2,
  IconX,
  IconHeadset,
  IconChevronRight,
  IconUsers,
} from '@tabler/icons-react'
import { useAuthStore } from '../stores/authStore.js'
import './AppLayout.css'

export default function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logoutUser = useAuthStore((state) => state.logoutUser)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'

  const userInitials = useMemo(() => {
    const name = user?.name || ''
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }, [user?.name])

  const currentRouteTitle = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return 'Dashboard General'
    if (path.startsWith('/tickets/')) return 'Detalle del Ticket'
    if (path.startsWith('/tickets')) return 'Gestión de Tickets'
    if (path.startsWith('/bot-history')) return 'Historial del Bot'
    if (path.startsWith('/reports')) return 'Métricas y Reportes'
    if (path.startsWith('/users')) return 'Gestión de Usuarios y Roles de Agente'
    return 'Inicio'
  }, [location.pathname])

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

      {/* Sidebar lateral */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <IconHeadset size={24} strokeWidth={2} />
            </div>
            <div className="brand-text">
              <span className="brand-title">Helpdesk AI</span>
              <span className="brand-subtitle">Campus Virtual</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={closeMobileMenu} aria-label="Cerrar menú">
            <IconX size={20} />
          </button>
        </div>

        <div className="nav-section-label">NAVEGACIÓN PRINCIPAL</div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'router-link-active' : ''}`}
            onClick={closeMobileMenu}
          >
            <div className="nav-link-content">
              <IconLayoutDashboard size={20} strokeWidth={1.8} className="nav-icon" />
              <span>Dashboard</span>
            </div>
            <IconChevronRight size={16} className="nav-arrow" />
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) => `nav-link ${isActive ? 'router-link-active' : ''}`}
            onClick={closeMobileMenu}
          >
            <div className="nav-link-content">
              <IconTicket size={20} strokeWidth={1.8} className="nav-icon" />
              <span>Tickets</span>
            </div>
            <IconChevronRight size={16} className="nav-arrow" />
          </NavLink>

          <NavLink
            to="/bot-history"
            className={({ isActive }) => `nav-link ${isActive ? 'router-link-active' : ''}`}
            onClick={closeMobileMenu}
          >
            <div className="nav-link-content">
              <IconRobot size={20} strokeWidth={1.8} className="nav-icon" />
              <span>Historial Bot</span>
            </div>
            <IconChevronRight size={16} className="nav-arrow" />
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'router-link-active' : ''}`}
            onClick={closeMobileMenu}
          >
            <div className="nav-link-content">
              <IconChartBar size={20} strokeWidth={1.8} className="nav-icon" />
              <span>Reportes & KPIs</span>
            </div>
            <IconChevronRight size={16} className="nav-arrow" />
          </NavLink>

          {/* Gestión de Usuarios y Roles (Exclusivo Administrador) */}
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link ${isActive ? 'router-link-active' : ''}`}
              onClick={closeMobileMenu}
            >
              <div className="nav-link-content">
                <IconUsers size={20} strokeWidth={1.8} className="nav-icon" />
                <span>Usuarios & Roles</span>
              </div>
              <IconChevronRight size={16} className="nav-arrow" />
            </NavLink>
          )}
        </nav>

        {/* Estado del sistema */}
        <div className="system-status-box">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-text">Moodle Sync & Bot Activos</span>
          </div>
          <span className="status-hint">v2.0 · En línea</span>
        </div>

        {/* Footer Usuario */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {userInitials}
            </div>
            <div className="user-details">
              <span className="user-name" title={user?.name || 'Usuario'}>
                {user?.name || 'Usuario'}
              </span>
              <span className="user-role-badge">
                {user?.role || 'Staff'}
              </span>
            </div>
          </div>

          <button
            className="btn-logout"
            title="Cerrar sesión"
            onClick={handleLogout}
          >
            <IconLogout size={18} strokeWidth={1.8} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="main-wrapper">
        {/* Barra superior Header */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <IconMenu2 size={22} />
            </button>
            <div className="page-context">
              <span className="context-breadcrumb">Plataforma Helpdesk</span>
              <span className="context-divider">/</span>
              <span className="context-current">{currentRouteTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="live-badge">
              <span className="live-pulse"></span>
              <span>En vivo</span>
            </div>

            <div className="topbar-user">
              <span className="topbar-greeting">
                Hola, <b>{user?.name?.split(' ')[0] || 'Usuario'}</b>
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

