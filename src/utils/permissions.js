/**
 * ==============================================================================
 * HELPDESK CAMPUS - SISTEMA CENTRAL DE ROLES Y PERMISOS
 * ==============================================================================
 * Mapeo y validación de roles institucionales y permisos de navegación.
 * Permite compatibilidad tanto con los códigos de rol del backend (DIRECTOR,
 * TECNICO, DOCENTE, ESTUDIANTE) como con sus equivalentes virtuales (admin,
 * support, teacher, estudiante).
 * ==============================================================================
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
}

/**
 * Normaliza el rol del usuario a una constante conocida (ADMIN, SUPPORT, etc.)
 * @param {Object} user 
 * @returns {string} Código normalizado del rol
 */
export function normalizeRole(user) {
  if (!user) return ROLES.GUEST

  // El backend puede enviar: user.role ('admin', 'support') o user.rol ('DIRECTOR', 'TECNICO')
  const rawRole = String(user.rol?.nombre || user.rol || user.role || '').trim().toUpperCase()

  if (['ADMIN', 'DIRECTOR', 'ADMINISTRADOR', 'SUPERADMIN'].includes(rawRole)) {
    return ROLES.ADMIN
  }

  if (['SUPPORT', 'TECNICO', 'TÉCNICO', 'SOPORTE', 'AGENTE'].includes(rawRole)) {
    return ROLES.SUPPORT
  }

  if (['TEACHER', 'DOCENTE', 'PROFESOR'].includes(rawRole)) {
    return ROLES.TEACHER
  }

  if (['ESTUDIANTE', 'STUDENT', 'ALUMNO'].includes(rawRole)) {
    return ROLES.STUDENT
  }

  return rawRole || ROLES.GUEST
}

/**
 * Determina si el usuario tiene rol de Administrador (Director)
 * @param {Object} user 
 * @returns {boolean}
 */
export function isAdmin(user) {
  return normalizeRole(user) === ROLES.ADMIN
}

/**
 * Determina si el usuario tiene rol de Soporte o Técnico
 * @param {Object} user 
 * @returns {boolean}
 */
export function isSupport(user) {
  return normalizeRole(user) === ROLES.SUPPORT
}

/**
 * Verifica si el usuario cumple con alguno de los roles permitidos.
 * Los administradores tienen acceso global si se especifica ADMIN en la lista o por privilegio de superusuario.
 * @param {Object} user 
 * @param {Array<string>} allowedRoles Lista de roles normalizados permitidos (p.ej. ['ADMIN', 'SUPPORT'])
 * @returns {boolean}
 */
export function hasRole(user, allowedRoles = []) {
  if (!user) return false
  if (!allowedRoles || allowedRoles.length === 0) return true

  const userRole = normalizeRole(user)

  // Los administradores tienen acceso a todas las secciones del sistema
  if (userRole === ROLES.ADMIN) {
    return true
  }

  // Normalizar los roles permitidos requeridos
  const normalizedAllowed = allowedRoles.map((r) => {
    const str = String(r).trim().toUpperCase()
    if (['DIRECTOR', 'ADMINISTRADOR'].includes(str)) return ROLES.ADMIN
    if (['TECNICO', 'TÉCNICO', 'SOPORTE'].includes(str)) return ROLES.SUPPORT
    return str
  })

  return normalizedAllowed.includes(userRole)
}

/**
 * Retorna la ruta inicial o por defecto a la que debe ser dirigido el usuario al loguearse o entrar a "/"
 * - Administrador: /dashboard
 * - Soporte / Técnico: /tickets (debido a que no tienen acceso a dashboard general ni configuración)
 * - Otros: /tickets
 * @param {Object} user 
 * @returns {string}
 */
export function getDefaultRouteForUser(user) {
  if (isAdmin(user)) {
    return '/dashboard'
  }
  // Para Soporte/Técnico y otros roles autorizados, el centro operativo son los Tickets
  return '/tickets'
}

/**
 * Información visual y de presentación asociada al rol del usuario
 * @param {Object} user 
 * @returns {Object} { label, badgeClass, description, isStaff }
 */
export function getRoleMeta(user) {
  const role = normalizeRole(user)

  switch (role) {
    case ROLES.ADMIN:
      return {
        key: ROLES.ADMIN,
        label: 'Administrador',
        fullLabel: 'Director / Administrador',
        badgeClass: 'badge-role-admin',
        description: 'Acceso Total a Vistas y Configuración',
        color: '#0284c7',
        isInternal: true,
      }
    case ROLES.SUPPORT:
      return {
        key: ROLES.SUPPORT,
        label: 'Soporte Técnico',
        fullLabel: 'Técnico de Soporte',
        badgeClass: 'badge-role-support',
        description: 'Gestión de Tickets, Bot y Reportes',
        color: '#10b981',
        isInternal: true,
      }
    case ROLES.TEACHER:
      return {
        key: ROLES.TEACHER,
        label: 'Docente',
        fullLabel: 'Profesor de Campus',
        badgeClass: 'badge-role-teacher',
        description: 'Usuario del Campus Virtual',
        color: '#f59e0b',
        isInternal: false,
      }
    case ROLES.STUDENT:
      return {
        key: ROLES.STUDENT,
        label: 'Estudiante',
        fullLabel: 'Alumno de Campus',
        badgeClass: 'badge-role-student',
        description: 'Usuario del Campus Virtual',
        color: '#64748b',
        isInternal: false,
      }
    default:
      return {
        key: 'GUEST',
        label: 'Invitado',
        fullLabel: 'Usuario General',
        badgeClass: 'badge-role-guest',
        description: 'Acceso Estándar',
        color: '#94a3b8',
        isInternal: false,
      }
  }
}
