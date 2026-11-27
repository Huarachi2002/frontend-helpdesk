import React, { useState, useRef, useEffect } from 'react'
import {
  IconPalette,
  IconSun,
  IconMoon,
  IconClock,
  IconContrast,
  IconTypography,
  IconMinus,
  IconPlus,
  IconRotate,
  IconBriefcase,
  IconSparkles,
  IconMoodSmile,
  IconCheck,
  IconX,
  IconAccessible,
} from '@tabler/icons-react'
import {
  useAppearanceStore,
  THEME_OPTIONS,
  MODE_OPTIONS,
  MIN_FONT_SCALE,
  MAX_FONT_SCALE,
  FONT_SCALE_STEP,
} from '../stores/appearanceStore.js'
import './AppearanceAccessibilityBar.css'

const THEME_ICONS = {
  adults: IconBriefcase,
  youth: IconSparkles,
  kids: IconMoodSmile,
}

export default function AppearanceAccessibilityBar({ variant = 'topbar' }) {
  const theme = useAppearanceStore((s) => s.theme)
  const modePreference = useAppearanceStore((s) => s.modePreference)
  const effectiveMode = useAppearanceStore((s) => s.effectiveMode)
  const fontScale = useAppearanceStore((s) => s.fontScale)
  const highContrast = useAppearanceStore((s) => s.highContrast)

  const setTheme = useAppearanceStore((s) => s.setTheme)
  const setModePreference = useAppearanceStore((s) => s.setModePreference)
  const toggleQuickDayNight = useAppearanceStore((s) => s.toggleQuickDayNight)
  const setFontScale = useAppearanceStore((s) => s.setFontScale)
  const increaseFontScale = useAppearanceStore((s) => s.increaseFontScale)
  const decreaseFontScale = useAppearanceStore((s) => s.decreaseFontScale)
  const toggleHighContrast = useAppearanceStore((s) => s.toggleHighContrast)
  const resetAppearance = useAppearanceStore((s) => s.resetAppearance)

  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const activeThemeMeta = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0]
  const fontPercent = Math.round(fontScale * 100)

  const scheduleText =
    effectiveMode === 'day'
      ? 'Horario actual: Día (06:00–18:59)'
      : 'Horario actual: Noche (19:00–05:59)'

  return (
    <div
      className={`appearance-bar appearance-bar--${variant}`}
      ref={containerRef}
    >
      {/* Botón rápido Día / Noche */}
      <button
        type="button"
        className="appearance-quick-btn"
        onClick={toggleQuickDayNight}
        title={
          effectiveMode === 'night'
            ? 'Cambiar a Modo Día (Claro)'
            : 'Cambiar a Modo Noche (Oscuro)'
        }
        aria-label={
          effectiveMode === 'night'
            ? 'Cambiar a Modo Día'
            : 'Cambiar a Modo Noche'
        }
      >
        {effectiveMode === 'night' ? (
          <IconSun size={18} strokeWidth={2} />
        ) : (
          <IconMoon size={18} strokeWidth={2} />
        )}
      </button>

      {/* Botón principal: Temas y Accesibilidad */}
      <button
        type="button"
        className={`appearance-trigger-btn ${open ? 'is-open' : ''} ${
          highContrast ? 'is-hc' : ''
        }`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Abrir panel de temas, modo día/noche y accesibilidad"
      >
        <IconPalette size={17} strokeWidth={2} />
        <span className="appearance-trigger-label">{activeThemeMeta.label}</span>
        <span className="appearance-trigger-divider" aria-hidden="true" />
        <IconAccessible size={16} strokeWidth={2} />
        {fontPercent !== 100 && (
          <span className="appearance-trigger-pill">{fontPercent}%</span>
        )}
      </button>

      {/* Panel desplegable de Personalización y Accesibilidad */}
      {open && (
        <div
          className="appearance-popover"
          role="dialog"
          aria-label="Personalización visual y herramientas de accesibilidad"
        >
          <div className="appearance-popover-header">
            <div className="appearance-popover-title-group">
              <IconPalette size={18} strokeWidth={2} />
              <div>
                <h2 className="appearance-popover-title">Apariencia y Accesibilidad</h2>
                <p className="appearance-popover-subtitle">
                  Aplica a todo el sitio y se guarda automáticamente
                </p>
              </div>
            </div>
            <button
              type="button"
              className="appearance-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel de apariencia"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="appearance-popover-body">
            {/* SECCIÓN 1: 3 Temas dinámicos por segmento */}
            <section className="appearance-section" aria-label="Selector de temas por segmento">
              <div className="appearance-section-label">
                <span>Tema por segmento de usuario</span>
              </div>
              <div className="theme-cards-grid" role="radiogroup" aria-label="Temas disponibles">
                {THEME_OPTIONS.map((opt) => {
                  const Icon = THEME_ICONS[opt.id] || IconPalette
                  const isActive = theme === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`theme-option-card ${isActive ? 'is-active' : ''}`}
                      onClick={() => setTheme(opt.id)}
                    >
                      <div className="theme-option-top">
                        <span className="theme-option-icon">
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <div className="theme-swatches" aria-hidden="true">
                          {opt.swatch.map((color, idx) => (
                            <span
                              key={idx}
                              className="theme-swatch-dot"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="theme-option-name">{opt.label}</span>
                      <span className="theme-option-desc">{opt.subtitle}</span>
                      {isActive && (
                        <span className="theme-option-check" aria-hidden="true">
                          <IconCheck size={12} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* SECCIÓN 2: Modo Día / Noche (Automático o Manual) */}
            <section className="appearance-section" aria-label="Modo Día y Noche">
              <div className="appearance-section-label">
                <span>Modo Día / Noche</span>
                <span className="appearance-mode-badge">
                  {effectiveMode === 'day' ? 'Día' : 'Noche'}
                </span>
              </div>
              <div className="mode-segmented" role="radiogroup" aria-label="Conmutación Día o Noche">
                {MODE_OPTIONS.map((opt) => {
                  const isActive = modePreference === opt.id
                  const ModeIcon =
                    opt.id === 'auto'
                      ? IconClock
                      : opt.id === 'day'
                      ? IconSun
                      : IconMoon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`mode-segment-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => setModePreference(opt.id)}
                      title={opt.hint}
                    >
                      <ModeIcon size={15} strokeWidth={2} />
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="appearance-hint-text">
                {modePreference === 'auto'
                  ? `Conmutación automática · ${scheduleText}`
                  : `Modo manual seleccionado (${effectiveMode === 'day' ? 'Claro' : 'Oscuro'})`}
              </p>
            </section>

            {/* SECCIÓN 3: Accesibilidad WCAG — Tamaño de fuente */}
            <section className="appearance-section" aria-label="Tamaño de fuente">
              <div className="appearance-section-label">
                <span className="label-with-icon">
                  <IconTypography size={15} />
                  Tamaño de fuente
                </span>
                <div className="font-scale-status">
                  <span className="font-scale-value">{fontPercent}%</span>
                  {fontPercent !== 100 && (
                    <button
                      type="button"
                      className="font-reset-chip"
                      onClick={() => setFontScale(1)}
                    >
                      100%
                    </button>
                  )}
                </div>
              </div>

              <div className="font-controls-row">
                <button
                  type="button"
                  className="font-step-btn"
                  onClick={decreaseFontScale}
                  disabled={fontScale <= MIN_FONT_SCALE}
                  aria-label="Reducir tamaño de fuente"
                  title="Reducir tamaño de fuente (A-)"
                >
                  <IconMinus size={14} />
                  <span>A-</span>
                </button>

                <input
                  type="range"
                  className="font-range-slider"
                  min={MIN_FONT_SCALE}
                  max={MAX_FONT_SCALE}
                  step={FONT_SCALE_STEP}
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  aria-label="Control deslizante de tamaño de fuente"
                  aria-valuetext={`${fontPercent} por ciento`}
                />

                <button
                  type="button"
                  className="font-step-btn"
                  onClick={increaseFontScale}
                  disabled={fontScale >= MAX_FONT_SCALE}
                  aria-label="Aumentar tamaño de fuente"
                  title="Aumentar tamaño de fuente (A+)"
                >
                  <span>A+</span>
                  <IconPlus size={14} />
                </button>
              </div>
            </section>

            {/* SECCIÓN 4: Accesibilidad WCAG — Alto Contraste */}
            <section className="appearance-section" aria-label="Contraste de color WCAG">
              <button
                type="button"
                className={`contrast-toggle-card ${highContrast ? 'is-active' : ''}`}
                onClick={toggleHighContrast}
                aria-pressed={highContrast}
              >
                <div className="contrast-toggle-left">
                  <span className="contrast-icon-box">
                    <IconContrast size={18} strokeWidth={2} />
                  </span>
                  <div className="contrast-text-group">
                    <span className="contrast-title">Alto Contraste (WCAG)</span>
                    <span className="contrast-desc">
                      Maximiza legibilidad, bordes y foco de teclado
                    </span>
                  </div>
                </div>
                <span className={`contrast-switch ${highContrast ? 'on' : 'off'}`} aria-hidden="true">
                  <span className="contrast-switch-thumb" />
                </span>
              </button>
            </section>
          </div>

          <div className="appearance-popover-footer">
            <button
              type="button"
              className="appearance-reset-btn"
              onClick={resetAppearance}
            >
              <IconRotate size={14} />
              <span>Restablecer valores</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
