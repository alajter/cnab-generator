import { parseDocument, type ParsedDocument } from './documents'
import { parseAmount } from './money'
import { compareDates, parseDate, today, type CalendarDate } from './dates'
import { onlyDigits, toCnabText } from './text'

/** One payment, validated and normalized, ready for the generator. */
export interface Payment {
  /** Spreadsheet row number as the user sees it (header is row 1). */
  row: number
  nome: string
  documento: ParsedDocument
  banco: string
  agencia: string
  agenciaDv: string
  conta: string
  contaDv: string
  cents: number
  data: CalendarDate
  seuNumero: string
  finalidadeTed: string
  ispb: string
}

export type Severity = 'erro' | 'aviso'

export interface RowIssue {
  row: number
  column: string
  severity: Severity
  message: string
}

export interface ReadResult {
  payments: Payment[]
  issues: RowIssue[]
  /** Columns found in the sheet that were not recognized (shown to the user, never fatal). */
  ignoredColumns: string[]
}

/** Canonical column → accepted header names (compared lower-case, without accents or punctuation). */
export const COLUMNS: Record<string, string[]> = {
  nome: ['nome', 'favorecido', 'beneficiario', 'nome_favorecido', 'name', 'beneficiary_name'],
  documento: ['cpf_cnpj', 'cpf/cnpj', 'cpf', 'cnpj', 'documento', 'inscricao', 'document', 'beneficiary_document'],
  banco: ['banco', 'codigo_banco', 'cod_banco', 'bank', 'beneficiary_bank'],
  agencia: ['agencia', 'ag', 'agency', 'branch', 'beneficiary_agency'],
  agenciaDv: ['agencia_dv', 'dv_agencia', 'digito_agencia'],
  conta: ['conta', 'conta_corrente', 'cc', 'account', 'beneficiary_account'],
  contaDv: ['conta_dv', 'dv_conta', 'digito_conta', 'dv'],
  valor: ['valor', 'valor_pagamento', 'amount', 'value'],
  data: ['data_pagamento', 'data', 'data_do_pagamento', 'payment_date', 'date'],
  seuNumero: ['seu_numero', 'referencia', 'identificador', 'reference', 'id'],
  finalidadeTed: ['finalidade_ted', 'finalidade'],
  ispb: ['ispb', 'codigo_ispb'],
}

export const REQUIRED_COLUMNS = ['nome', 'documento', 'banco', 'agencia', 'conta', 'valor', 'data'] as const

export const COLUMN_LABELS: Record<string, string> = {
  nome: 'nome',
  documento: 'cpf_cnpj',
  banco: 'banco',
  agencia: 'agencia',
  agenciaDv: 'agencia_dv',
  conta: 'conta',
  contaDv: 'conta_dv',
  valor: 'valor',
  data: 'data_pagamento',
  seuNumero: 'seu_numero',
  finalidadeTed: 'finalidade_ted',
  ispb: 'ispb',
}

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-.]+/g, '_')
}

export function mapHeaders(headers: string[]): { map: Map<string, string>; ignored: string[] } {
  const map = new Map<string, string>()
  const ignored: string[] = []
  for (const header of headers) {
    const n = normalizeHeader(header)
    const canonical = Object.entries(COLUMNS).find(([, aliases]) => aliases.includes(n))?.[0]
    if (canonical && ![...map.values()].includes(canonical)) map.set(header, canonical)
    else if (header.trim() !== '') ignored.push(header)
  }
  return { map, ignored }
}

/** "12345-6" → ["12345", "6"]. Only splits when the DV column is empty. */
function splitDv(value: string): [string, string] {
  const m = value.trim().match(/^([\d.]+)-([\dxX])$/)
  return m ? [onlyDigits(m[1]), m[2].toUpperCase()] : [onlyDigits(value), '']
}

export interface ReadOptions {
  /** Used to warn about payment dates in the past. Defaults to the current day. */
  today?: CalendarDate
}

export function readPayments(rows: Record<string, unknown>[], options: ReadOptions = {}): ReadResult {
  const issues: RowIssue[] = []
  const payments: Payment[] = []
  const headers = rows.length ? Object.keys(rows[0]) : []
  const { map, ignored } = mapHeaders(headers)
  const present = new Set(map.values())
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c))
  if (rows.length === 0) {
    issues.push({ row: 1, column: '', severity: 'erro', message: 'A planilha está vazia.' })
    return { payments, issues, ignoredColumns: ignored }
  }
  if (missing.length) {
    issues.push({
      row: 1,
      column: '',
      severity: 'erro',
      message: `Faltam colunas obrigatórias: ${missing.map((c) => COLUMN_LABELS[c]).join(', ')}.`,
    })
    return { payments, issues, ignoredColumns: ignored }
  }

  const now = options.today ?? today()
  const seen = new Map<string, number>()

  rows.forEach((source, index) => {
    const row = index + 2
    const get = (col: string): unknown => {
      for (const [header, canonical] of map) if (canonical === col) return source[header]
      return undefined
    }
    const str = (col: string) => String(get(col) ?? '').trim()
    if (Object.values(source).every((v) => String(v ?? '').trim() === '')) return // blank line

    const rowIssues: RowIssue[] = []
    const err = (column: string, message: string) => rowIssues.push({ row, column: COLUMN_LABELS[column], severity: 'erro', message })
    const warn = (column: string, message: string) => rowIssues.push({ row, column: COLUMN_LABELS[column], severity: 'aviso', message })

    const nome = toCnabText(str('nome'))
    if (!nome) err('nome', 'Nome do favorecido vazio.')
    else if (nome.length > 30) warn('nome', `Nome com ${nome.length} caracteres; o arquivo guarda só os 30 primeiros ("${nome.slice(0, 30)}").`)

    const documento = parseDocument(get('documento'))
    if (!documento) err('documento', str('documento') ? `CPF/CNPJ inválido: "${str('documento')}" (dígito verificador não confere).` : 'CPF/CNPJ vazio.')

    const bancoDigits = onlyDigits(get('banco'))
    const banco = bancoDigits.padStart(3, '0')
    if (!bancoDigits || bancoDigits.length > 3) err('banco', `Código do banco inválido: "${str('banco')}". Use o código COMPE de 3 dígitos (ex.: 341).`)

    let [agencia, agenciaDv] = splitDv(str('agencia'))
    if (str('agenciaDv')) agenciaDv = str('agenciaDv').toUpperCase()
    if (!agencia || agencia.length > 5) err('agencia', `Agência inválida: "${str('agencia')}" (até 5 dígitos).`)
    if (agenciaDv.length > 1 || (agenciaDv && !/^[0-9X]$/.test(agenciaDv))) err('agenciaDv', `DV da agência inválido: "${agenciaDv}".`)

    let [conta, contaDv] = splitDv(str('conta'))
    if (str('contaDv')) contaDv = str('contaDv').toUpperCase()
    if (!conta || conta.length > 12) err('conta', `Conta inválida: "${str('conta')}" (até 12 dígitos).`)
    if (contaDv.length > 1 || (contaDv && !/^[0-9X]$/.test(contaDv))) err('contaDv', `DV da conta inválido: "${contaDv}".`)
    else if (!contaDv) warn('contaDv', 'Conta sem dígito verificador. A maioria dos bancos rejeita; confira.')

    const amount = parseAmount(get('valor'))
    if (!amount.ok) err('valor', amount.error)

    const data = parseDate(get('data'))
    if (!data) err('data', `Data inválida: "${str('data')}". Use DD/MM/AAAA.`)
    else if (compareDates(data, now) < 0) warn('data', 'Data de pagamento no passado. O banco pode rejeitar ou pagar no próximo dia útil.')
    else {
      const weekday = new Date(Date.UTC(data.year, data.month - 1, data.day)).getUTCDay()
      if (weekday === 0 || weekday === 6) warn('data', 'Data de pagamento num fim de semana. O banco paga no próximo dia útil ou rejeita.')
    }

    const seuNumero = toCnabText(str('seuNumero'))
    if (seuNumero.length > 20) warn('seuNumero', 'Seu número com mais de 20 caracteres; será cortado.')

    const finalidadeTed = str('finalidadeTed').toUpperCase()
    if (finalidadeTed.length > 5) err('finalidadeTed', `Finalidade da TED tem até 5 caracteres: "${finalidadeTed}".`)

    const ispb = onlyDigits(get('ispb'))
    if (ispb && ispb.length !== 8) err('ispb', `ISPB tem 8 dígitos: "${str('ispb')}".`)

    issues.push(...rowIssues)
    if (rowIssues.some((i) => i.severity === 'erro') || !documento || !amount.ok || !data) return

    const key = [documento.value, banco, agencia, conta, amount.cents, data.year, data.month, data.day].join('|')
    if (seen.has(key)) {
      issues.push({ row, column: '', severity: 'aviso', message: `Pagamento igual ao da linha ${seen.get(key)} (mesmo favorecido, conta, valor e data). É duplicado?` })
    } else seen.set(key, row)

    payments.push({
      row,
      nome,
      documento,
      banco,
      agencia,
      agenciaDv,
      conta,
      contaDv,
      cents: amount.cents,
      data,
      seuNumero: seuNumero.slice(0, 20),
      finalidadeTed,
      ispb,
    })
  })

  return { payments, issues, ignoredColumns: ignored }
}
