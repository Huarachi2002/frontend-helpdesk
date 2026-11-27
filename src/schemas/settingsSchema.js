import { z } from 'zod'
import { requiredIntegerField } from './validation.js'

export const systemSettingsSchema = z.object({
  horas_recordatorio_pendientes: requiredIntegerField({
    label: 'Las horas de inactividad para recordatorio',
    min: 1,
    max: 168,
    minMessage: 'El plazo de recordatorio debe ser de al menos 1 hora.',
    maxMessage: 'El plazo de recordatorio no puede exceder 168 horas (7 días).',
  }),
  dias_ticket_sin_respuesta: requiredIntegerField({
    label: 'Los días sin respuesta inicial',
    min: 1,
    max: 30,
    minMessage: 'Los días sin respuesta deben ser al menos 1 día.',
    maxMessage: 'Los días sin respuesta no pueden exceder 30 días.',
  }),
  resumen_diario_activo: z.boolean(),
  notificaciones_email_activas: z.boolean(),
  notificaciones_inapp_activas: z.boolean(),
  correo_remitente_nombre: z
    .string({ error: 'El nombre del remitente es obligatorio.' })
    .trim()
    .min(1, 'El nombre del remitente es obligatorio.')
    .max(100, 'El nombre del remitente no puede exceder los 100 caracteres.'),
  correo_remitente_direccion: z
    .string({ error: 'El correo electrónico del sistema es obligatorio.' })
    .trim()
    .min(1, 'El correo electrónico del sistema es obligatorio.')
    .email('Ingresa una dirección de correo electrónico válida.')
    .max(150, 'El correo electrónico no puede exceder los 150 caracteres.'),
  notif_evento_ticket_creado_email: z.boolean(),
  notif_evento_ticket_creado_inapp: z.boolean(),
  notif_evento_cambio_estado_email: z.boolean(),
  notif_evento_cambio_estado_inapp: z.boolean(),
  notif_evento_solicitud_reasignacion_email: z.boolean(),
  notif_evento_solicitud_reasignacion_inapp: z.boolean(),
  notif_evento_reasignacion_email: z.boolean(),
  notif_evento_reasignacion_inapp: z.boolean(),
  notif_evento_recordatorio_email: z.boolean(),
  notif_evento_recordatorio_inapp: z.boolean(),
  notif_evento_sin_respuesta_email: z.boolean(),
  notif_evento_sin_respuesta_inapp: z.boolean(),
  relevamiento_permitir_saltar_niveles: z.boolean(),
})
