<template>
  <div class="app-shell">
    <!-- Overlay móvil para sidebar -->
    <div
      v-if="mobileMenuOpen"
      class="sidebar-backdrop"
      @click="mobileMenuOpen = false"
    />

    <!-- Sidebar lateral -->
    <aside :class="['sidebar', { 'sidebar-open': mobileMenuOpen }]">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <IconHeadset :size="24" stroke-width="2" />
          </div>
          <div class="brand-text">
            <span class="brand-title">Helpdesk AI</span>
            <span class="brand-subtitle">Campus Virtual</span>
          </div>
        </div>
        <button class="mobile-close-btn" @click="mobileMenuOpen = false">
          <IconX :size="20" />
        </button>
      </div>

      <div class="nav-section-label">NAVEGACIÓN PRINCIPAL</div>

      <nav class="sidebar-nav">
        <RouterLink
          to="/dashboard"
          class="nav-link"
          @click="mobileMenuOpen = false"
        >
          <div class="nav-link-content">
            <IconLayoutDashboard :size="20" stroke-width="1.8" class="nav-icon" />
            <span>Dashboard</span>
          </div>
          <IconChevronRight :size="16" class="nav-arrow" />
        </RouterLink>

        <RouterLink
          to="/tickets"
          class="nav-link"
          @click="mobileMenuOpen = false"
        >
          <div class="nav-link-content">
            <IconTicket :size="20" stroke-width="1.8" class="nav-icon" />
            <span>Tickets</span>
          </div>
          <IconChevronRight :size="16" class="nav-arrow" />
        </RouterLink>

        <RouterLink
          to="/bot-history"
          class="nav-link"
          @click="mobileMenuOpen = false"
        >
          <div class="nav-link-content">
            <IconRobot :size="20" stroke-width="1.8" class="nav-icon" />
            <span>Historial Bot</span>
          </div>
          <IconChevronRight :size="16" class="nav-arrow" />
        </RouterLink>

        <RouterLink
          to="/reports"
          class="nav-link"
          @click="mobileMenuOpen = false"
        >
          <div class="nav-link-content">
            <IconChartBar :size="20" stroke-width="1.8" class="nav-icon" />
            <span>Reportes & KPIs</span>
          </div>
          <IconChevronRight :size="16" class="nav-arrow" />
        </RouterLink>
      </nav>

      <!-- Estado del sistema -->
      <div class="system-status-box">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Moodle Sync & Bot Activos</span>
        </div>
        <span class="status-hint">v2.0 · En línea</span>
      </div>

      <!-- Footer Usuario -->
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">
            {{ userInitials }}
          </div>
          <div class="user-details">
            <span class="user-name" :title="auth.user?.name || 'Usuario'">
              {{ auth.user?.name || 'Usuario' }}
            </span>
            <span class="user-role-badge">
              {{ auth.user?.role || 'Staff' }}
            </span>
          </div>
        </div>

        <button
          class="btn-logout"
          title="Cerrar sesión"
          @click="handleLogout"
        >
          <IconLogout :size="18" stroke-width="1.8" />
          <span>Salir</span>
        </button>
      </div>
    </aside>

    <!-- Área Principal -->
    <div class="main-wrapper">
      <!-- Barra superior Header -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-toggle-btn" @click="mobileMenuOpen = true">
            <IconMenu2 :size="22" />
          </button>
          <div class="page-context">
            <span class="context-breadcrumb">Plataforma Helpdesk</span>
            <span class="context-divider">/</span>
            <span class="context-current">{{ currentRouteTitle }}</span>
          </div>
        </div>

        <div class="topbar-right">
          <div class="live-badge">
            <span class="live-pulse"></span>
            <span>En vivo</span>
          </div>

          <div class="topbar-user">
            <span class="topbar-greeting">Hola, <b>{{ auth.user?.name?.split(' ')[0] || 'Usuario' }}</b></span>
          </div>
        </div>
      </header>

      <!-- Vista activa -->
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
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
} from '@tabler/icons-vue'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

const mobileMenuOpen = ref(false)

const userInitials = computed(() => {
  const name = auth.user?.name || ''
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const currentRouteTitle = computed(() => {
  switch (route.name) {
    case 'dashboard': return 'Dashboard General'
    case 'tickets': return 'Gestión de Tickets'
    case 'ticket-detail': return 'Detalle del Ticket'
    case 'bot-history': return 'Historial del Bot'
    case 'reports': return 'Métricas y Reportes'
    default: return 'Inicio'
  }
})

async function handleLogout() {
  await auth.logoutUser()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: #f8fafc;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: #0f172a;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #1e293b;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 50;
  transition: transform 0.25s ease;
}

.sidebar-header {
  padding: 20px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #ffffff;
}

.brand-subtitle {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.mobile-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.nav-section-label {
  padding: 20px 22px 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #64748b;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
  overflow-y: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.15s ease-in-out;
  position: relative;
}

.nav-link-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-icon {
  color: #94a3b8;
  transition: color 0.15s;
}

.nav-arrow {
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.15s ease;
  color: #64748b;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}

.nav-link:hover .nav-icon {
  color: #38bdf8;
}

.nav-link:hover .nav-arrow {
  opacity: 1;
  transform: translateX(0);
}

.nav-link.router-link-active {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.15), rgba(14, 165, 233, 0.05));
  color: #38bdf8;
  font-weight: 600;
}

.nav-link.router-link-active .nav-icon {
  color: #38bdf8;
}

.nav-link.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: #38bdf8;
  border-radius: 0 4px 4px 0;
}

/* System status */
.system-status-box {
  margin: 12px 14px;
  padding: 12px 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.status-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #cbd5e1;
}

.status-hint {
  font-size: 10.5px;
  color: #64748b;
  padding-left: 16px;
}

/* User footer */
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #090e17;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #38bdf8;
  font-weight: 700;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}

.user-role-badge {
  font-size: 10.5px;
  color: #38bdf8;
  text-transform: capitalize;
}

.btn-logout {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 7px;
  padding: 7px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-logout:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

/* Main Area */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f8fafc;
}

/* Topbar */
.topbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 30;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mobile-toggle-btn {
  display: none;
  background: transparent;
  border: none;
  color: #334155;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.page-context {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.context-breadcrumb {
  color: #64748b;
  font-weight: 500;
}

.context-divider {
  color: #cbd5e1;
}

.context-current {
  color: #0f172a;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
}

.live-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.topbar-greeting {
  font-size: 13px;
  color: #475569;
}

.topbar-greeting b {
  color: #0f172a;
}

/* Page content wrapper */
.page-content {
  flex: 1;
  padding: 28px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Responsive */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .mobile-close-btn {
    display: block;
  }

  .mobile-toggle-btn {
    display: flex;
    align-items: center;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    z-index: 45;
  }

  .topbar {
    padding: 0 16px;
  }

  .page-content {
    padding: 16px;
  }
}
</style>
