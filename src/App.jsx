import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfirmDialog } from 'primereact/confirmdialog'

import { ToastProvider } from './context/ToastContext.jsx'
import { ProtectedRoute, GuestRoute, RoleDefaultRedirect } from './components/ProtectedRoute.jsx'
import { ROLES } from './utils/permissions.js'
import AppLayout from './layouts/AppLayout.jsx'

import LoginView from './views/auth/LoginView.jsx'
import DashboardView from './views/helpdesk/DashboardView.jsx'
import TicketListView from './views/helpdesk/TicketListView.jsx'
import TicketDetailView from './views/helpdesk/TicketDetailView.jsx'
import BotHistoryView from './views/admin/BotHistoryView.jsx'
import ReportView from './views/reports/ReportView.jsx'
import UsersManagementView from './views/admin/UsersManagementView.jsx'
import CategoriesManagementView from './views/admin/CategoriesManagementView.jsx'
import PrioritiesManagementView from './views/admin/PrioritiesManagementView.jsx'
import SettingsManagementView from './views/admin/SettingsManagementView.jsx'

export default function App() {
  return (
    <ToastProvider>
      <ConfirmDialog />
      <Routes>
        {/* Ruta pública para invitados / login */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginView />
            </GuestRoute>
          }
        />

        {/* Rutas autenticadas dentro del Layout Maestro */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirección dinámica en la raíz según rol: Admin -> Dashboard | Soporte -> Tickets */}
          <Route index element={<RoleDefaultRedirect />} />

          {/* Dashboard General: Exclusivo para Administrador */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <DashboardView />
              </ProtectedRoute>
            }
          />

          {/* Gestión de Tickets: Permitido para Administrador y Soporte / Técnico */}
          <Route
            path="tickets"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPPORT]}>
                <TicketListView />
              </ProtectedRoute>
            }
          />
          <Route
            path="tickets/:id"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPPORT]}>
                <TicketDetailView />
              </ProtectedRoute>
            }
          />

          {/* Historial del Bot de IA: Permitido para Administrador y Soporte / Técnico */}
          <Route
            path="bot-history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPPORT]}>
                <BotHistoryView />
              </ProtectedRoute>
            }
          />

          {/* Reportes & KPIs: Permitido para Administrador y Soporte / Técnico */}
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPPORT]}>
                <ReportView />
              </ProtectedRoute>
            }
          />

          {/* Gestión de Usuarios y Roles: Exclusivo Administrador */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <UsersManagementView />
              </ProtectedRoute>
            }
          />

          {/* Gestión de Clasificación de Categorías: Exclusivo Administrador */}
          <Route
            path="categories"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <CategoriesManagementView />
              </ProtectedRoute>
            }
          />

          {/* Gestión de Prioridades y SLAs: Exclusivo Administrador */}
          <Route
            path="priorities"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <PrioritiesManagementView />
              </ProtectedRoute>
            }
          />

          {/* Configuraciones del Sistema & Políticas Globales de Notificación: Exclusivo Administrador */}
          <Route
            path="settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <SettingsManagementView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Captura de rutas desconocidas -> redirige a la raíz con resolución inteligente de rol */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
