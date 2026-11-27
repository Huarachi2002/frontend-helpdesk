import { z } from 'zod'

/**
 * Ejecuta un esquema Zod sobre los datos proporcionados y devuelve un resultado
 * normalizado listo para usar en formularios React.
 */
export function validateSchema(schema, data) {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      fieldErrors: {},
      firstError: '',
    }
  }

  const fieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path.join('.')) : '_form'
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message
    }
  }

  const firstError = result.error.issues[0]?.message || 'Revisa los campos marcados en el formulario.'

  return {
    success: false,
    data: null,
    fieldErrors,
    firstError,
  }
}

/**
 * Extrae errores de validación devueltos por Laravel (HTTP 422) en el mismo
 * formato { fieldErrors, message } que devuelve validateSchema.
 */
export function extractApiValidationErrors(err, fallbackMessage = 'Error al procesar la solicitud.') {
  const data = err?.response?.data
  const fieldErrors = {}

  if (data?.errors && typeof data.errors === 'object') {
    for (const [field, messages] of Object.entries(data.errors)) {
      const msg = Array.isArray(messages) ? messages[0] : String(messages)
      if (msg) {
        fieldErrors[field] = msg
      }
    }
  }

  const firstFieldMsg = Object.values(fieldErrors)[0]
  const message = firstFieldMsg || data?.message || err?.message || fallbackMessage

  return { fieldErrors, message }
}

/**
 * Convierte un valor de input numérico (string o number) a número entero
 * validando rango y entregando mensajes claros en español.
 */
export function requiredIntegerField({
  label,
  min,
  max,
  minMessage,
  maxMessage,
  requiredMessage,
}) {
  return z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      const num = typeof val === 'number' ? val : Number(String(val).trim())
      return Number.isNaN(num) ? NaN : num
    },
    z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? requiredMessage || `${label} es obligatorio.`
            : `${label} debe ser un número válido.`,
      })
      .refine((n) => Number.isFinite(n), {
        message: `${label} debe ser un número válido.`,
      })
      .int(`${label} debe ser un número entero.`)
      .min(min, minMessage || `${label} debe ser al menos ${min}.`)
      .max(max, maxMessage || `${label} no puede exceder ${max}.`)
  )
}

/**
 * Campo opcional que acepta vacío/null o un número entero positivo.
 */
export function optionalPositiveIntField(label) {
  return z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      const num = typeof val === 'number' ? val : Number(String(val).trim())
      return Number.isNaN(num) ? NaN : num
    },
    z
      .number({
        error: `${label} debe ser un número entero válido.`,
      })
      .refine((n) => Number.isFinite(n), {
        message: `${label} debe ser un número entero válido.`,
      })
      .int(`${label} debe ser un número entero.`)
      .positive(`${label} debe ser un número entero positivo.`)
      .nullable()
  )
}
