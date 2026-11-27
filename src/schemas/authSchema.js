import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo institucional es obligatorio.' })
    .trim()
    .min(1, 'El correo institucional es obligatorio.')
    .email('Ingresa un correo electrónico válido.')
    .max(150, 'El correo electrónico no puede exceder los 150 caracteres.'),
  password: z
    .string({ error: 'La contraseña de acceso es obligatoria.' })
    .min(1, 'La contraseña de acceso es obligatoria.'),
})
