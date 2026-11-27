import { z } from 'zod'
import { requiredIntegerField } from './validation.js'

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical']
export const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed']

export const createTicketSchema = z.object({
  asunto: z
    .string({ error: 'El asunto de la incidencia es obligatorio.' })
    .trim()
    .min(1, 'El asunto de la incidencia es obligatorio.')
    .min(3, 'El asunto debe tener al menos 3 caracteres.')
    .max(255, 'El asunto no puede exceder los 255 caracteres.'),
  categoria_id: requiredIntegerField({
    label: 'La categoría temática',
    min: 1,
    max: 999999999,
    requiredMessage: 'Debes seleccionar una categoría temática.',
    minMessage: 'Debes seleccionar una categoría temática válida.',
  }),
  priority: z.enum(TICKET_PRIORITIES, {
    error: 'Selecciona un nivel de prioridad válido.',
  }),
  descripcion: z
    .string({ error: 'La descripción del problema es obligatoria.' })
    .trim()
    .min(1, 'La descripción del problema es obligatoria.')
    .min(5, 'Describe el problema con al menos 5 caracteres.')
    .max(5000, 'La descripción no puede exceder los 5000 caracteres.'),
})

export const ticketReplySchema = z.object({
  mensaje: z
    .string({ error: 'Escribe el contenido de la respuesta.' })
    .trim()
    .min(1, 'Escribe el contenido de la respuesta.')
    .min(2, 'La respuesta debe tener al menos 2 caracteres.')
    .max(10000, 'La respuesta no puede exceder los 10000 caracteres.'),
  nextStatus: z
    .enum(TICKET_STATUSES, { error: 'El estado destino indicado no es válido.' })
    .nullable()
    .optional(),
})

export function createReassignTicketSchema(isAdminUser) {
  return z
    .object({
      assigned_to: z.preprocess(
        (val) => (val === null || val === undefined ? '' : String(val).trim()),
        z.string().min(1, 'Debes seleccionar un agente de soporte para la reasignación.')
      ),
      comments: z
        .string()
        .trim()
        .max(1000, 'El motivo no puede exceder los 1000 caracteres.')
        .optional()
        .default(''),
    })
    .superRefine((data, ctx) => {
      if (!isAdminUser && (!data.comments || data.comments.length < 3)) {
        ctx.addIssue({
          code: 'custom',
          path: ['comments'],
          message: !data.comments
            ? 'Debes ingresar una justificación o motivo para la solicitud de reasignación.'
            : 'La justificación debe tener al menos 3 caracteres.',
        })
      }
    })
}

export const rejectReassignmentSchema = z.object({
  reason: z
    .string({ error: 'Debes ingresar un motivo para el rechazo de la solicitud.' })
    .trim()
    .min(1, 'Debes ingresar un motivo para el rechazo de la solicitud.')
    .min(3, 'El motivo del rechazo debe tener al menos 3 caracteres.')
    .max(1000, 'El motivo del rechazo no puede exceder los 1000 caracteres.'),
})

export const ticketStatusUpdateSchema = z.object({
  status: z.enum(TICKET_STATUSES, {
    error: 'Selecciona un estado válido para el ticket.',
  }),
  comments: z
    .string()
    .trim()
    .max(1000, 'El comentario no puede exceder los 1000 caracteres.')
    .optional()
    .default(''),
})

// --- Relevamiento (movimiento vertical en la Estructura Organizacional) ---

export const escalateTicketSchema = z.object({
  destino_usuario_id: z.preprocess(
    (val) => (val === null || val === undefined ? '' : String(val).trim()),
    z.string().min(1, 'Selecciona al usuario que recibirá el ticket.')
  ),
  motivo: z
    .string({ error: 'El motivo del relevamiento es obligatorio.' })
    .trim()
    .min(1, 'El motivo del relevamiento es obligatorio.')
    .min(10, 'Describe el motivo del relevamiento con al menos 10 caracteres.')
    .max(2000, 'El motivo no puede exceder los 2000 caracteres.'),
})

export function createReturnTicketSchema(requiresTarget) {
  return z
    .object({
      instrucciones: z
        .string({ error: 'Las instrucciones de la devolución son obligatorias.' })
        .trim()
        .min(1, 'Las instrucciones de la devolución son obligatorias.')
        .min(10, 'Describe las instrucciones con al menos 10 caracteres.')
        .max(2000, 'Las instrucciones no pueden exceder los 2000 caracteres.'),
      destino_usuario_id: z.union([z.number(), z.string(), z.null()]).optional(),
    })
    .superRefine((data, ctx) => {
      if (requiresTarget && !data.destino_usuario_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['destino_usuario_id'],
          message: 'El responsable anterior ya no está disponible: selecciona a otra persona de su cargo.',
        })
      }
    })
}
