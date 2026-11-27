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
import { loginSchema, validateSchema, extractApiValidationErrors } from '../../schemas/index.js'
import AppearanceAccessibilityBar from '../../components/AppearanceAccessibilityBar.jsx'
import SiteFooter from '../../components/SiteFooter.jsx'
import './LoginView.css'

export default function LoginView() {
  const loginUser = useAuthStore((state) => state.loginUser)
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const validation = validateSchema(loginSchema, form)
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const data = await loginUser(validation.data)
      const targetRoute = getDefaultRouteForUser(data?.user)
      navigate(targetRoute, { replace: true })
    } catch (err) {
      const apiErr = extractApiValidationErrors(
        err,
        'Credenciales incorrectas o servidor no disponible.'
      )
      setFieldErrors(apiErr.fieldErrors)
      setError(apiErr.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-shell">
      <a href="#login-main" className="skip-to-content">
        Saltar al formulario de inicio de sesión
      </a>

      <header className="login-topbar-controls">
        <span className="login-topbar-brand">HelpDesk SmartCampus · UAGRM</span>
        <AppearanceAccessibilityBar variant="floating" />
      </header>

      <main id="login-main" className="login-wrapper">
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

        <form className="login-form" onSubmit={handleLogin} noValidate>
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
                className={`field-input ${fieldErrors.email ? 'input-invalid' : ''}`}
                placeholder="admin@helpdesk.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.email && (
              <span className="field-error-text">{fieldErrors.email}</span>
            )}
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
                className={`field-input ${fieldErrors.password ? 'input-invalid' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
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
            {fieldErrors.password && (
              <span className="field-error-text">{fieldErrors.password}</span>
            )}
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
      </main>

      <SiteFooter variant="auth" />
    </div>
  )
}

