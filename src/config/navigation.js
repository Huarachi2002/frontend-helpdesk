import {
  IconLayoutDashboard,
  IconTicket,
  IconRobot,
  IconChartBar,
  IconUsers,
  IconFolders,
  IconFlame,
  IconSettings,
} from '@tabler/icons-react'
import { ROLES, hasRole } from '../utils/permissions.js'

/**
 * ==============================================================================
 * CONFIGURACIÓN CENTRALIZADA DE LA BARRA DE NAVEGACIÓN
 * ==============================================================================
 * Define los módulos del sistema, sus rutas, iconos y qué roles tienen permiso
 * para visualizarlos e interactuar con ellos.
 *
 * REGLAS DE NEGOCIO:
 * 1. ADMINISTRADOR: Puede acceder a todas las vistas (Dashboard, Tickets,
 *    Historial Bot, Reportes & KPIs, Usuarios & Roles, Categorías).
 * 2. SOPORTE / TÉCNICO: Solo puede ingresar y visualizar Tickets, Historial Bot
 *    y Reportes & KPIs. No tiene acceso a Dashboard ni a configuración administrativa.
 * ==============================================================================
 */
export const NAVIGATION_SCHEMA = [
  {
    id: 'monitoring',
    sectionTitle: 'SUPERVISIÓN & CONTROL',
    roles: [ROLES.ADMIN],
    items: [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        to: '/dashboard',
        icon: IconLayoutDashboard,
        roles: [ROLES.ADMIN],
        description: 'Métricas en tiempo real y resumen del sistema',
        badge: null,
      },
    ],
  },
  {
    id: 'operations',
    sectionTitle: 'OPERACIONES DE SOPORTE',
    roles: [ROLES.ADMIN, ROLES.SUPPORT],
    items: [
      {
        id: 'nav-tickets',
        title: 'Tickets',
        to: '/tickets',
        icon: IconTicket,
        roles: [ROLES.ADMIN, ROLES.SUPPORT],
        description: 'Bandeja de incidencias y atención a usuarios',
        badge: null,
      },
      {
        id: 'nav-bot-history',
        title: 'Historial Bot',
        to: '/bot-history',
        icon: IconRobot,
        roles: [ROLES.ADMIN, ROLES.SUPPORT],
        description: 'Interacciones del chatbot inteligente y escalamientos',
        badge: 'IA',
      },
      {
        id: 'nav-reports',
        title: 'Reportes & KPIs',
        to: '/reports',
        icon: IconChartBar,
        roles: [ROLES.ADMIN, ROLES.SUPPORT],
        description: 'Analítica de tiempos de respuesta, SLA y rendimiento',
        badge: null,
      },
    ],
  },
  {
    id: 'system_admin',
    sectionTitle: 'ADMINISTRACIÓN DEL SISTEMA',
    roles: [ROLES.ADMIN],
    items: [
      {
        id: 'nav-users',
        title: 'Usuarios & Roles',
        to: '/users',
        icon: IconUsers,
        roles: [ROLES.ADMIN],
        description: 'Gestión de personal, asignaciones y permisos',
        badge: null,
      },
      {
        id: 'nav-categories',
        title: 'Categorías',
        to: '/categories',
        icon: IconFolders,
        roles: [ROLES.ADMIN],
        description: 'Clasificación temática de incidencias',
        badge: null,
      },
      {
        id: 'nav-priorities',
        title: 'Prioridades & SLAs',
        to: '/priorities',
        icon: IconFlame,
        roles: [ROLES.ADMIN],
        description: 'Niveles de urgencia, pesos de escalamiento y tiempos SLA',
        badge: null,
      },
      {
        id: 'nav-settings',
        title: 'Configuraciones',
        to: '/settings',
        icon: IconSettings,
        roles: [ROLES.ADMIN],
        description: 'Parámetros del sistema y políticas globales de notificación',
        badge: null,
      },
    ],
  },
]

/**
 * Filtra dinámicamente las secciones y elementos de menú para el usuario actual
 * según sus permisos y rol institucional.
 * @param {Object} user 
 * @returns {Array} Secciones filtradas con sus respectivos items autorizados
 */
export function getNavigationForUser(user) {
  if (!user) return []

  return NAVIGATION_SCHEMA
    .map((section) => {
      // Verificar si el usuario tiene permiso para la sección general
      const hasSectionAccess = hasRole(user, section.roles)
      if (!hasSectionAccess) return null

      // Filtrar los items dentro de la sección
      const allowedItems = section.items.filter((item) => hasRole(user, item.roles))
      if (allowedItems.length === 0) return null

      return {
        ...section,
        items: allowedItems,
      }
    })
    .filter(Boolean)
}

/**
 * Resuelve el título y contexto de la ruta activa para la barra superior (Topbar / Breadcrumbs)
 * @param {string} pathname 
 * @returns {{ title: string, category: string, subtitle?: string }}
 */
export function getRouteContext(pathname = '') {
  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'Dashboard General',
      category: 'Supervisión',
      subtitle: 'Monitoreo de estado operativo y métricas principales',
    }
  }
  if (pathname.startsWith('/tickets/')) {
    return {
      title: 'Detalle del Ticket',
      category: 'Operaciones',
      subtitle: 'Seguimiento, mensajes, cambios de estado y resolución',
    }
  }
  if (pathname.startsWith('/tickets')) {
    return {
      title: 'Gestión de Tickets',
      category: 'Operaciones',
      subtitle: 'Bandeja de incidencias y solicitudes del campus virtual',
    }
  }
  if (pathname.startsWith('/bot-history')) {
    return {
      title: 'Historial del Bot',
      category: 'Operaciones',
      subtitle: 'Registro de consultas atendidas por el bot de IA',
    }
  }
  if (pathname.startsWith('/reports')) {
    return {
      title: 'Reportes & KPIs',
      category: 'Analítica',
      subtitle: 'Tiempos de resolución (MTTR), primera respuesta (FRT) y métricas SLA',
    }
  }
  if (pathname.startsWith('/users')) {
    return {
      title: 'Usuarios & Roles',
      category: 'Administración',
      subtitle: 'Directorio de personal institucional y configuración de agentes',
    }
  }
  if (pathname.startsWith('/categories')) {
    return {
      title: 'Gestión de Categorías',
      category: 'Administración',
      subtitle: 'Clasificación de incidencias y temáticas de soporte',
    }
  }
  if (pathname.startsWith('/priorities')) {
    return {
      title: 'Gestión de Prioridades & SLAs',
      category: 'Administración',
      subtitle: 'Niveles de urgencia, escalamiento y tiempos de resolución comprometidos',
    }
  }
  if (pathname.startsWith('/settings')) {
    return {
      title: 'Configuraciones & Notificaciones',
      category: 'Administración',
      subtitle: 'Parámetros de recordatorios, tiempos de espera y canales de alerta',
    }
  }
  return {
    title: 'Plataforma Helpdesk',
    category: 'Campus Virtual',
    subtitle: 'Soporte a usuarios y administración académica',
  }
}
