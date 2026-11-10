import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.js'

export function ProtectedRoute({ children, requiresAdmin = false }) {
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-app)',
        color: 'var(--text-main)',
        fontSize: '15px',
        fontWeight: '600',
        gap: '12px'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--color-primary-600)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>Cargando sesión...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiresAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default ProtectedRoute
