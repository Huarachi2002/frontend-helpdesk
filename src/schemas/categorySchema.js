import { z } from 'zod'

export const categorySchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  nombre: z
    .string({ error: 'El nombre de la categoría es obligatorio.' })
    .trim()
    .min(1, 'El nombre de la categoría es obligatorio.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .max(2000, 'La descripción no puede exceder los 2000 caracteres.')
    .optional()
    .default(''),
  activo: z.boolean().default(true),
})
