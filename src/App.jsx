import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfirmDialog } from 'primereact/confirmdialog'

import { ToastProvider } from './context/ToastContext.jsx'
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'

import LoginView from './views/auth/LoginView.jsx'
import DashboardView from './views/helpdesk/DashboardView.jsx'
import TicketListView from './views/helpdesk/TicketListView.jsx'
import TicketDetailView from './views/helpdesk/TicketDetailView.jsx'
import BotHistoryView from './views/admin/BotHistoryView.jsx'
import ReportView from './views/reports/ReportView.jsx'
import UsersManagementView from './views/admin/UsersManagementView.jsx'

export default function App() {
  return (
    <ToastProvider>
      <ConfirmDialog />
      <Routes>
        {/* Ruta pública para invitados */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginView />
            </GuestRoute>
          }
        />

        {/* Rutas protegidas dentro del AppLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="tickets" element={<TicketListView />} />
          <Route path="tickets/:id" element={<TicketDetailView />} />
          <Route path="bot-history" element={<BotHistoryView />} />
          <Route path="reports" element={<ReportView />} />
          <Route
            path="users"
            element={
              <ProtectedRoute requiresAdmin>
                <UsersManagementView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Captura de rutas desconocidas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}

