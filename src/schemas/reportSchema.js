import { z } from 'zod'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const optionalIsoDate = z
  .string()
  .trim()
  .refine((val) => val === '' || ISO_DATE_REGEX.test(val), {
    message: 'La fecha debe tener el formato AAAA-MM-DD.',
  })

const requiredIsoDate = (label) =>
  z
    .string({ error: `La fecha "${label}" es obligatoria.` })
    .trim()
    .min(1, `La fecha "${label}" es obligatoria.`)
    .regex(ISO_DATE_REGEX, `La fecha "${label}" debe tener el formato AAAA-MM-DD.`)

export const exportDateRangeSchema = z
  .object({
    date_from: optionalIsoDate.default(''),
    date_to: optionalIsoDate.default(''),
  })
  .refine(
    (data) => !(data.date_from && data.date_to && data.date_from > data.date_to),
    {
      path: ['date_to'],
      message: 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".',
    }
  )

export const metricsReportFilterSchema = z
  .object({
    date_from: requiredIsoDate('Desde'),
    date_to: requiredIsoDate('Hasta'),
    level: z.enum(['general', 'technician', 'category'], {
      error: 'El nivel de agrupación seleccionado no es válido.',
    }),
    technician_id: z.string().trim().optional().default(''),
    category_id: z.string().trim().optional().default(''),
  })
  .refine((data) => data.date_from <= data.date_to, {
    path: ['date_to'],
    message: 'La fecha "Hasta" no puede ser anterior a la fecha "Desde".',
  })
