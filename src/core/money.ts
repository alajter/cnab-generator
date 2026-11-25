/**
 * Amounts are handled as integer centavos end to end. No floating point ever touches money.
 *
 * Accepted: 1234.56, "1234,56", "1.234,56", "1,234.56", "R$ 1.234,56", "1234".
 * Rejected as ambiguous: "1.234" and "1,234". In Brazil the first is usually one thousand two
 * hundred and thirty-four reais, in an English spreadsheet it is one real and change. Guessing
 * wrong pays someone a thousand times too much or too little, so we ask instead.
 */
export type AmountResult = { ok: true; cents: number } | { ok: false; error: string }

export function parseAmount(input: unknown): AmountResult {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return { ok: false, error: 'O valor precisa ser maior que zero.' }
    const cents = Math.round(input * 100)
    if (Math.abs(input * 100 - cents) > 1e-6) return { ok: false, error: `O valor ${input} tem mais de duas casas decimais.` }
    return { ok: true, cents }
  }

  const raw = String(input ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
  if (raw === '') return { ok: false, error: 'Valor vazio.' }
  if (!/^\d[\d.,]*$/.test(raw)) return { ok: false, error: `"${input}" não é um valor. Use, por exemplo, 1234,56.` }

  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  let integer: string
  let fraction = ''

  if (lastComma === -1 && lastDot === -1) {
    integer = raw
  } else {
    const sepIndex = Math.max(lastComma, lastDot)
    const sep = raw[sepIndex]
    const other = sep === ',' ? '.' : ','
    const after = raw.slice(sepIndex + 1)
    const before = raw.slice(0, sepIndex)
    const sepCount = raw.split(sep).length - 1

    if (sepCount > 1) {
      // "1.234.567": only thousands separators.
      if (!/^\d{1,3}([.,]\d{3})+$/.test(raw) || raw.includes(other)) return { ok: false, error: `Não consegui ler "${input}".` }
      return { ok: false, error: `"${input}" é ambíguo. Escreva com centavos, por exemplo ${raw},00.` }
    }
    if (after.length === 3 && !before.includes(other)) {
      return { ok: false, error: `"${input}" é ambíguo (mil ou um real?). Escreva com centavos, por exemplo ${raw.replace(/[.,]/, '')},00 ou ${before},${after.slice(0, 2)}.` }
    }
    if (after.length === 3) {
      // "1,234.567" or "1.234,567": three decimals.
      return { ok: false, error: `"${input}" tem mais de duas casas decimais.` }
    }
    if (after.length > 2) return { ok: false, error: `"${input}" tem mais de duas casas decimais.` }
    integer = before.split(other).join('')
    if (before.includes(other) && !new RegExp(`^\\d{1,3}(\\${other}\\d{3})+$`).test(before)) {
      return { ok: false, error: `Não consegui ler "${input}".` }
    }
    fraction = after
  }

  if (!/^\d+$/.test(integer) || !/^\d{0,2}$/.test(fraction)) return { ok: false, error: `Não consegui ler "${input}".` }
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return { ok: false, error: `"${input}" é grande demais.` }
  if (cents <= 0) return { ok: false, error: 'O valor precisa ser maior que zero.' }
  return { ok: true, cents }
}

export function formatBRL(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(cents)
  const integer = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}R$ ${integer},${String(abs % 100).padStart(2, '0')}`
}
