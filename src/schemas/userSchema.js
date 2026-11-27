import { z } from 'zod'
import { optionalPositiveIntField } from './validation.js'

export const USER_ROLES = ['TECNICO', 'DIRECTOR', 'DOCENTE', 'ESTUDIANTE', 'VISITANTE']
const INTERNAL_ROLES = ['DIRECTOR', 'TECNICO']

export function createUserSchema({ isEditing = false } = {}) {
  return z
    .object({
      id: z.union([z.string().trim(), z.number()]).nullable().optional(),
      ci: z
        .string({ error: 'El CI del usuario es obligatorio.' })
        .trim()
        .min(1, 'El CI del usuario es obligatorio.')
        .max(30, 'El CI no puede exceder los 30 caracteres.'),
      nombre: z
        .string({ error: 'El nombre del usuario es obligatorio.' })
        .trim()
        .min(1, 'El nombre del usuario es obligatorio.')
        .max(100, 'El nombre no puede exceder los 100 caracteres.'),
      apellido: z
        .string()
        .trim()
        .max(100, 'El apellido no puede exceder los 100 caracteres.')
        .optional()
        .default(''),
      correo: z
        .string({ error: 'El correo electrónico institucional es obligatorio.' })
        .trim()
        .min(1, 'El correo electrónico institucional es obligatorio.')
        .email('Ingresa un correo electrónico válido.')
        .max(150, 'El correo electrónico no puede exceder los 150 caracteres.'),
      password: z.string().optional().default(''),
      role: z.enum(USER_ROLES, {
        error: 'Selecciona un rol institucional válido.',
      }),
      moodle_user_id: optionalPositiveIntField('El ID de usuario Moodle'),
      cargo_codigo: z.string().trim().optional().default(''),
      sesion: z.boolean().default(true),
      is_active: z.boolean().default(true),
      allowed_priorities: z.array(z.string()).default([]),
      category_ids: z.array(z.coerce.number().int().positive()).default([]),
    })
    .superRefine((data, ctx) => {
      const password = data.password || ''

      if (!isEditing) {
        if (!password) {
          ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message: 'La contraseña es obligatoria al registrar un nuevo usuario.',
          })
        } else if (password.length < 6) {
          ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message: 'La contraseña debe tener al menos 6 caracteres.',
          })
        }
      } else if (password.length > 0 && password.length < 6) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'La nueva contraseña debe tener al menos 6 caracteres.',
        })
      }

      if (INTERNAL_ROLES.includes(data.role) && !data.cargo_codigo) {
        ctx.addIssue({
          code: 'custom',
          path: ['cargo_codigo'],
          message: 'Selecciona el cargo que ocupa el usuario en la Estructura Organizacional.',
        })
      }
    })
}
