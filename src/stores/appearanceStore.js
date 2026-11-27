import { create } from 'zustand'

const STORAGE_KEY = 'helpdesk_appearance_prefs_v1'

export const THEME_OPTIONS = [
  {
    id: 'adults',
    label: 'Adultos',
    subtitle: 'Institucional y sobrio',
    swatch: ['#0284c7', '#0f172a', '#f8fafc'],
  },
  {
    id: 'youth',
    label: 'Jóvenes',
    subtitle: 'Moderno y vibrante',
    swatch: ['#7c3aed', '#17112b', '#06b6d4'],
  },
  {
    id: 'kids',
    label: 'Niños',
    subtitle: 'Lúdico y amigable',
    swatch: ['#f97316', '#1e3a8a', '#14b8a6'],
  },
]

export const MODE_OPTIONS = [
  { id: 'auto', label: 'Automático', hint: 'Día 06:00–18:59 · Noche 19:00–05:59' },
  { id: 'day', label: 'Día', hint: 'Modo claro manual' },
  { id: 'night', label: 'Noche', hint: 'Modo oscuro manual' },
]

export const MIN_FONT_SCALE = 0.85
export const MAX_FONT_SCALE = 1.5
export const FONT_SCALE_STEP = 0.05

/**
 * Calcula el modo efectivo (day | night) según el horario local del navegador
 * Día: 06:00 a 18:59 | Noche: 19:00 a 05:59
 */
export function resolveModeBySchedule(date = new Date()) {
  const hour = date.getHours()
  return hour >= 6 && hour < 19 ? 'day' : 'night'
}

export function resolveEffectiveMode(modePreference) {
  if (modePreference === 'day' || modePreference === 'night') {
    return modePreference
  }
  return resolveModeBySchedule()
}

function clampFontScale(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 1
  const clamped = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, numeric))
  return Math.round(clamped * 100) / 100
}

function loadSavedPreferences() {
  const defaults = {
    theme: 'adults',
    modePreference: 'auto',
    fontScale: 1,
    highContrast: false,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    const validThemes = THEME_OPTIONS.map((t) => t.id)
    const validModes = MODE_OPTIONS.map((m) => m.id)

    return {
      theme: validThemes.includes(parsed.theme) ? parsed.theme : defaults.theme,
      modePreference: validModes.includes(parsed.modePreference)
        ? parsed.modePreference
        : defaults.modePreference,
      fontScale: clampFontScale(parsed.fontScale ?? defaults.fontScale),
      highContrast: Boolean(parsed.highContrast),
    }
  } catch {
    return defaults
  }
}

function persistPreferences(prefs) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: prefs.theme,
        modePreference: prefs.modePreference,
        fontScale: prefs.fontScale,
        highContrast: prefs.highContrast,
      })
    )
  } catch {
    // Ignorar errores de almacenamiento privado
  }
}

/**
 * Aplica los atributos semánticos al elemento raíz <html> para que todo el CSS
 * y PrimeReact respondan instantáneamente sin parpadeo.
 */
export function applyAppearanceToDocument({ theme, effectiveMode, fontScale, highContrast }) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.setAttribute('data-mode', effectiveMode)
  root.setAttribute('data-contrast', highContrast ? 'high' : 'normal')
  root.style.setProperty('--font-scale', String(clampFontScale(fontScale)))
  root.style.colorScheme = effectiveMode === 'night' ? 'dark' : 'light'
}

const initialPrefs = loadSavedPreferences()
const initialEffectiveMode = resolveEffectiveMode(initialPrefs.modePreference)

export const useAppearanceStore = create((set, get) => ({
  theme: initialPrefs.theme,
  modePreference: initialPrefs.modePreference,
  effectiveMode: initialEffectiveMode,
  fontScale: initialPrefs.fontScale,
  highContrast: initialPrefs.highContrast,

  setTheme: (theme) => {
    const valid = THEME_OPTIONS.some((t) => t.id === theme)
    if (!valid) return
    set((state) => {
      const next = { ...state, theme }
      persistPreferences(next)
      applyAppearanceToDocument(next)
      return { theme }
    })
  },

  setModePreference: (modePreference) => {
    const valid = MODE_OPTIONS.some((m) => m.id === modePreference)
    if (!valid) return
    const effectiveMode = resolveEffectiveMode(modePreference)
    set((state) => {
      const next = { ...state, modePreference, effectiveMode }
      persistPreferences(next)
      applyAppearanceToDocument(next)
      return { modePreference, effectiveMode }
    })
  },

  toggleQuickDayNight: () => {
    const currentEffective = get().effectiveMode
    const nextMode = currentEffective === 'night' ? 'day' : 'night'
    get().setModePreference(nextMode)
  },

  syncAutoSchedule: () => {
    const state = get()
    if (state.modePreference !== 'auto') return
    const nextEffective = resolveModeBySchedule()
    if (nextEffective !== state.effectiveMode) {
      const next = { ...state, effectiveMode: nextEffective }
      applyAppearanceToDocument(next)
      set({ effectiveMode: nextEffective })
    }
  },

  setFontScale: (value) => {
    const fontScale = clampFontScale(value)
    set((state) => {
      const next = { ...state, fontScale }
      persistPreferences(next)
      applyAppearanceToDocument(next)
      return { fontScale }
    })
  },

  increaseFontScale: () => {
    const current = get().fontScale
    get().setFontScale(current + FONT_SCALE_STEP)
  },

  decreaseFontScale: () => {
    const current = get().fontScale
    get().setFontScale(current - FONT_SCALE_STEP)
  },

  setHighContrast: (highContrast) => {
    const value = Boolean(highContrast)
    set((state) => {
      const next = { ...state, highContrast: value }
      persistPreferences(next)
      applyAppearanceToDocument(next)
      return { highContrast: value }
    })
  },

  toggleHighContrast: () => {
    get().setHighContrast(!get().highContrast)
  },

  resetAppearance: () => {
    const effectiveMode = resolveEffectiveMode('auto')
    const defaults = {
      theme: 'adults',
      modePreference: 'auto',
      effectiveMode,
      fontScale: 1,
      highContrast: false,
    }
    persistPreferences(defaults)
    applyAppearanceToDocument(defaults)
    set(defaults)
  },
}))

let scheduleTimerId = null

/**
 * Inicializa los atributos DOM antes del primer render y activa la vigilancia
 * automática del horario Día/Noche cada 60 segundos.
 */
export function initAppearance() {
  const state = useAppearanceStore.getState()
  applyAppearanceToDocument(state)

  if (typeof window !== 'undefined' && !scheduleTimerId) {
    scheduleTimerId = window.setInterval(() => {
      useAppearanceStore.getState().syncAutoSchedule()
    }, 60 * 1000)
  }
}
