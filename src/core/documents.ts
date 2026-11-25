/**
 * CPF and CNPJ check digits, including the alphanumeric CNPJ that the Receita Federal issues
 * from July 2026 (12 characters from 0-9 and A-Z, then two numeric check digits).
 * Character value is its ASCII code minus 48, so digits keep their value and 'A' counts 17.
 */

export type DocumentKind = 'cpf' | 'cnpj'

export interface ParsedDocument {
  kind: DocumentKind
  /** Normalized: upper-case, no punctuation. 11 characters for CPF, 14 for CNPJ. */
  value: string
  /** FEBRABAN G005: 1 = CPF, 2 = CNPJ. */
  tipoInscricao: '1' | '2'
}

const charValue = (c: string) => c.charCodeAt(0) - 48

function mod11Digit(chars: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) sum += charValue(chars[i]) * weights[i]
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const d1 = mod11Digit(cpf, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = mod11Digit(cpf, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return cpf[9] === String(d1) && cpf[10] === String(d2)
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const d1 = mod11Digit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = mod11Digit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj[12] === String(d1) && cnpj[13] === String(d2)
}

/** Accepts "123.456.789-09", "12.ABC.345/01DE-35", etc. Returns null when the check digits fail. */
export function parseDocument(input: unknown): ParsedDocument | null {
  const value = String(input ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
  if (value.length === 11 && isValidCpf(value)) return { kind: 'cpf', value, tipoInscricao: '1' }
  if (value.length === 14 && isValidCnpj(value)) return { kind: 'cnpj', value, tipoInscricao: '2' }
  return null
}

/** Inscrição fields are 14 positions: a CPF is right-aligned and zero-filled. */
export function inscricaoField(doc: ParsedDocument): string {
  return doc.value.padStart(14, '0')
}
