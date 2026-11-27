import { z } from 'zod'
import { requiredIntegerField } from './validation.js'

export const prioritySchema = z.object({
  id: z.union([z.string().trim(), z.number()]).nullable().optional(),
  nombre: z
    .string({ error: 'El nombre de la prioridad es obligatorio.' })
    .trim()
    .min(1, 'El nombre de la prioridad es obligatorio.')
    .max(50, 'El nombre no puede exceder los 50 caracteres.'),
  codigo: z
    .string({ error: 'El código identificador es obligatorio.' })
    .trim()
    .toLowerCase()
    .min(1, 'El código identificador (ej: low, high) es obligatorio.')
    .max(20, 'El código no puede exceder los 20 caracteres.')
    .regex(
      /^[a-z0-9_-]+$/,
      'El código solo puede contener letras minúsculas, números, guiones (-) y guiones bajos (_).'
    ),
  peso_nivel: requiredIntegerField({
    label: 'El nivel de peso jerárquico',
    min: 1,
    max: 100,
    requiredMessage: 'El peso o nivel jerárquico es obligatorio.',
    minMessage: 'El peso o nivel jerárquico debe ser al menos 1.',
    maxMessage: 'El peso o nivel jerárquico no puede exceder 100.',
  }),
  sla_horas_resolucion: requiredIntegerField({
    label: 'El tiempo SLA de resolución',
    min: 1,
    max: 8760,
    requiredMessage: 'El tiempo SLA en horas es obligatorio.',
    minMessage: 'El tiempo SLA debe ser de al menos 1 hora.',
    maxMessage: 'El tiempo SLA no puede exceder 8760 horas (1 año).',
  }),
  activo: z.boolean().default(true),
})
