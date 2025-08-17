/**
 * Utilidad simple para formatear moneda.
 */

/**
 * Formatea un número como moneda local en CUP por defecto.
 */
export function formatCurrency(value: number, currency = 'CUP', locale = 'es-CU'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}
