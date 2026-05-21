/**
 * Format a stat value for display.
 * - Integers remain as-is (e.g. 42 → "42")
 * - Floats are rounded to at most 3 decimal places, trailing zeros stripped
 *   (e.g. 0.4560000 → "0.456", 12.10 → "12.1")
 * - Non-numeric strings pass through unchanged
 * - undefined / null → "—"
 */
export function fmtVal(v: number | string | undefined | null, key?: string): string {
  if (v === undefined || v === null) return '—'
  
  const isCountingStat = key && ['ppg', 'rpg', 'apg', 'spg', 'bpg'].includes(key)
  const decimals = isCountingStat ? 1 : 3

  if (typeof v === 'number') {
    return Number.isInteger(v) && !isCountingStat ? String(v) : parseFloat(v.toFixed(decimals)).toString()
  }
  const n = Number(v)
  if (!isNaN(n) && v !== '') {
    return Number.isInteger(n) && !isCountingStat ? String(n) : parseFloat(n.toFixed(decimals)).toString()
  }
  return String(v)
}
