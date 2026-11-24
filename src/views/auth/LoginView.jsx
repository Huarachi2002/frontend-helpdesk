import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import {
  IconHeadset,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconLogin,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useAuthStore } from '../../stores/authStore.js'
import { getDefaultRouteForUser } from '../../utils/permissions.js'
import './LoginView.css'

export default function LoginView() {
  const loginUser = useAuthStore((state) => state.loginUser)
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = await loginUser(form)
      const targetRoute = getDefaultRouteForUser(data?.user)
      navigate(targetRoute, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Credenciales incorrectas o servidor no disponible.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-avatar">
            <IconHeadset size={28} strokeWidth={2} />
          </div>
          <h1 className="brand-title">Mesa Ayuda | UAGRM</h1>
          <p className="brand-desc">
            Plataforma de soporte y gestión de incidencias académicas
          </p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {/* Error Alert */}
          {error && (
            <div className="login-error-alert">
              <IconAlertCircle size={18} className="error-alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Correo */}
          <div className="form-group">
            <label className="input-label" htmlFor="email-input">
              Correo Institucional
            </label>
            <div className="input-container">
              <IconMail size={18} className="field-icon" />
              <input
                id="email-input"
                name="email"
                type="email"
                className="field-input"
                placeholder="admin@helpdesk.com"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="form-group">
            <label className="input-label" htmlFor="password-input">
              Contraseña de Acceso
            </label>
            <div className="input-container">
              <IconLock size={18} className="field-icon" />
              <input
                id="password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="field-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle-btn"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón Ingresar */}
          <Button
            type="submit"
            label="Iniciar Sesión"
            severity="primary"
            className="login-submit-btn"
            loading={loading}
            icon={<IconLogin size={18} />}
          />
        </form>

        <div className="login-footer">
          <span>Sistema Integrado Helpdesk & Moodle</span>
        </div>
      </div>
    </div>
  )
}

