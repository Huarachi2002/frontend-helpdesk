/**
 * ==============================================================================
 * HELPDESK CAMPUS - DESIGN SYSTEM TOKENS (JAVASCRIPT EXPORT)
 * ==============================================================================
 * Este archivo permite utilizar la paleta oficial de colores en scripts JS/TS,
 * configuraciones de Chart.js, librerías de gráficos o exportarlo a otros proyectos.
 * ==============================================================================
 */

export const themePalette = {
  primary: {
    50:  '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7', // Brand Main
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  slate: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#090e17',
  },
  success: {
    50:  '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
  },
  warning: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
  },
  danger: {
    50:  '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
  },
  purple: {
    50:  '#faf5ff',
    100: '#ede9fe',
    200: '#e9d5ff',
    500: '#a855f7',
    600: '#7c3aed',
    700: '#6d28d9',
  },
}

/**
 * Paleta predefinida para gráficos de Chart.js y visualizaciones estadísticas
 */
export const chartColors = {
  blue:      '#0284c7',
  indigo:    '#6366f1',
  amber:     '#f59e0b',
  emerald:   '#10b981',
  pink:      '#ec4899',
  purple:    '#8b5cf6',
  // Array de colores secuenciales para gráficos de torta/dona
  palette: [
    '#0284c7', // 1. Primario
    '#6366f1', // 2. Índigo
    '#f59e0b', // 3. Ámbar
    '#10b981', // 4. Esmeralda
    '#ec4899', // 5. Rosa
    '#8b5cf6', // 6. Violeta
  ],
}

/**
 * Mapeo de estados de incidencias para vistas y filtros
 */
export const ticketStatusColors = {
  open: {
    bg: themePalette.primary[100],
    text: themePalette.primary[700],
    severity: 'info',
  },
  in_progress: {
    bg: themePalette.warning[100],
    text: themePalette.warning[700],
    severity: 'warn',
  },
  waiting: {
    bg: themePalette.purple[100],
    text: themePalette.purple[700],
    severity: 'contrast',
  },
  resolved: {
    bg: themePalette.success[100],
    text: themePalette.success[800],
    severity: 'success',
  },
  closed: {
    bg: themePalette.slate[200],
    text: themePalette.slate[600],
    severity: 'secondary',
  },
}

/**
 * Mapeo de prioridades de incidencias
 */
export const ticketPriorityColors = {
  low: {
    bg: themePalette.success[100],
    text: themePalette.success[800],
    severity: 'success',
  },
  medium: {
    bg: themePalette.warning[100],
    text: themePalette.warning[800],
    severity: 'warn',
  },
  high: {
    bg: themePalette.danger[100],
    text: themePalette.danger[700],
    severity: 'danger',
  },
  critical: {
    bg: themePalette.danger[800],
    text: '#ffffff',
    severity: 'danger',
  },
}

