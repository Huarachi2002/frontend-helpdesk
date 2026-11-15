import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.js'
import { hasRole, getDefaultRouteForUser, ROLES } from '../utils/permissions.js'

/**
 * Componente de protección de rutas autenticadas y autorizadas por rol.
 * 
 * Props:
 * - children: Componente hijo o vista a renderizar
 * - allowedRoles: Array de roles permitidos (ej: [ROLES.ADMIN] o [ROLES.ADMIN, ROLES.SUPPORT])
 * - requiresAdmin: Flag de compatibilidad para requerir rol de Administrador
 */
export function ProtectedRoute({ children, allowedRoles, requiresAdmin = false }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const logoutUser = useAuthStore((state) => state.logoutUser)

  const [loading, setLoading] = useState(token && !user)
  const location = useLocation()

  useEffect(() => {
    let isMounted = true

    if (token && !user) {
      fetchUser()
        .catch(() => {
          logoutUser()
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [token, user, fetchUser, logoutUser])

  // Estado de carga inicial mientras se recupera el usuario desde Sanctum
  if (loading) {
    return (
      <div className="auth-loading-screen" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-app, #f8fafc)',
        color: 'var(--text-main, #0f172a)',
        fontSize: '15px',
        fontWeight: '600',
        gap: '14px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #cbd5e1',
          borderTopColor: '#0284c7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#475569' }}>Cargando sesión y verificando permisos...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Si no hay token, enviar al login recordando la ruta origen
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Resolver la lista de roles autorizados
  const effectiveRoles = allowedRoles || (requiresAdmin ? [ROLES.ADMIN] : null)

  // Si se especificaron roles permitidos y el usuario no cuenta con ellos, redirigir a su vista base permitida
  if (effectiveRoles && effectiveRoles.length > 0 && !hasRole(user, effectiveRoles)) {
    const fallbackRoute = getDefaultRouteForUser(user)
    return <Navigate to={fallbackRoute} replace />
  }

  return children
}

/**
 * Componente para rutas públicas solo para invitados (ej: /login)
 * Si el usuario ya está autenticado, lo redirige dinámicamente según su rol.
 */
export function GuestRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (token) {
    const targetRoute = getDefaultRouteForUser(user)
    return <Navigate to={targetRoute} replace />
  }

  return children
}

/**
 * Redirección inteligente para la ruta raíz ("/") según el rol del usuario conectado:
 * - Administrador -> /dashboard
 * - Soporte / Técnico -> /tickets
 */
export function RoleDefaultRedirect() {
  const user = useAuthStore((state) => state.user)
  const targetRoute = getDefaultRouteForUser(user)
  return <Navigate to={targetRoute} replace />
}

export default ProtectedRoute
