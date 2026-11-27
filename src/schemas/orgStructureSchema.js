import { z } from 'zod'
import { requiredIntegerField } from './validation.js'

export const cargoSchema = z.object({
  codigo: z
    .string({ error: 'El código del cargo es obligatorio.' })
    .trim()
    .toUpperCase()
    .min(1, 'El código del cargo es obligatorio.')
    .max(30, 'El código no puede exceder los 30 caracteres.')
    .regex(
      /^[A-Za-z0-9\-_.]+$/,
      'El código solo puede contener letras, números y los caracteres - _ .'
    ),
  nombre: z
    .string({ error: 'El nombre del cargo es obligatorio.' })
    .trim()
    .min(1, 'El nombre del cargo es obligatorio.')
    .max(150, 'El nombre del cargo no puede exceder los 150 caracteres.'),
  seccion: z
    .string({ error: 'La sección funcional es obligatoria.' })
    .trim()
    .min(1, 'La sección funcional es obligatoria.')
    .max(80, 'La sección funcional no puede exceder los 80 caracteres.'),
  cargo_superior_codigo: z.string().trim().optional().default(''),
  dependencia_externa: z
    .string()
    .trim()
    .max(150, 'La dependencia externa no puede exceder los 150 caracteres.')
    .optional()
    .default(''),
  orden: requiredIntegerField({
    label: 'El orden',
    min: 0,
    max: 999,
    requiredMessage: 'El orden es obligatorio (usa 0 o superior).',
    minMessage: 'El orden debe ser un número mayor o igual a 0.',
    maxMessage: 'El orden no puede exceder 999.',
  }),
  activo: z.boolean().default(true),
})
