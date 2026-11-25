/**
 * Dates are parsed as calendar days, never through `new Date("2026-01-15")`, which reads the
 * string as UTC midnight and lands on the previous day anywhere west of Greenwich (all of Brazil).
 */
export interface CalendarDate {
  year: number
  month: number
  day: number
}

export function isValidDate({ year, month, day }: CalendarDate): boolean {
  if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1) return false
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day <= daysInMonth
}

/** Accepts DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD, DDMMAAAA, or an Excel serial day number. */
export function parseDate(input: unknown): CalendarDate | null {
  if (typeof input === 'number' && Number.isInteger(input) && input > 20000 && input < 80000) {
    // Excel serial date (1900 system). Day 25569 is 1970-01-01.
    const d = new Date((input - 25569) * 86400000)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
  }
  const s = String(input ?? '').trim()
  let m: RegExpMatchArray | null
  let date: CalendarDate | null = null
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) date = { day: +m[1], month: +m[2], year: +m[3] }
  else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/))) date = { year: +m[1], month: +m[2], day: +m[3] }
  else if ((m = s.match(/^(\d{2})(\d{2})(\d{4})$/))) date = { day: +m[1], month: +m[2], year: +m[3] }
  return date && isValidDate(date) ? date : null
}

/** DDMMAAAA, the CNAB date format. */
export function toCnabDate({ year, month, day }: CalendarDate): string {
  return `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`
}

export function fromCnabDate(value: string): CalendarDate | null {
  if (!/^\d{8}$/.test(value)) return null
  const date = { day: +value.slice(0, 2), month: +value.slice(2, 4), year: +value.slice(4) }
  return isValidDate(date) ? date : null
}

export function formatDateBR({ year, month, day }: CalendarDate): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

export function today(now = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}
