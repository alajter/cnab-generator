import type { Field } from './layout'

/**
 * Banks process CNAB files as plain ASCII. Accents and lowercase letters are a common cause of
 * rejected files, so every alphanumeric value is upper-cased and stripped of diacritics.
 */
export function toCnabText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ºª°]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 \-./,&()@:'+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export class FieldOverflowError extends Error {
  constructor(
    readonly field: Field,
    readonly value: string,
  ) {
    super(`"${field.label}" aceita ${field.end - field.start + 1} dígitos; recebeu ${value.length} (${value}).`)
  }
}

/**
 * Formats one value to its exact width.
 * Numbers are right-aligned with zeros. Text is left-aligned with spaces and truncated.
 * A number that does not fit throws: truncating a number silently changes it.
 */
export function formatField(field: Field, raw: string | number | undefined): string {
  const width = field.end - field.start + 1
  const value = raw === undefined || raw === null ? '' : String(raw)
  if (field.type === 'num') {
    if (!/^\d*$/.test(value)) throw new Error(`"${field.label}" só aceita dígitos; recebeu "${value}".`)
    if (value.length > width) throw new FieldOverflowError(field, value)
    return value.padStart(width, '0')
  }
  return toCnabText(value).slice(0, width).padEnd(width, ' ')
}

export function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}
