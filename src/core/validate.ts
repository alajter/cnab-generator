import { fromCnabDate } from './dates'
import { isValidCnpj, isValidCpf } from './documents'
import { LAYOUT, LINE_LENGTH, RECORD_NAMES, type Field, type RecordKind } from './layout'
import { formatBRL } from './money'

export type Severity = 'erro' | 'aviso'

export interface FileIssue {
  /** 1-based line number; 0 for file-level problems. */
  line: number
  field?: string
  severity: Severity
  message: string
}

export interface ParsedField {
  field: Field
  value: string
  issue?: FileIssue
}

export interface ParsedLine {
  line: number
  raw: string
  kind: RecordKind | null
  fields: ParsedField[]
}

export interface LoteReport {
  lote: string
  forma: string
  payments: number
  cents: number
}

export interface ValidationReport {
  lines: ParsedLine[]
  issues: FileIssue[]
  lotes: LoteReport[]
  totalCents: number
  /** True when there is no issue of severity "erro". */
  ok: boolean
}

export function detectKind(raw: string): RecordKind | null {
  switch (raw[7]) {
    case '0':
      return 'headerArquivo'
    case '1':
      return 'headerLote'
    case '3':
      return raw[13] === 'A' ? 'segmentoA' : raw[13] === 'B' ? 'segmentoB' : null
    case '5':
      return 'trailerLote'
    case '9':
      return 'trailerArquivo'
    default:
      return null
  }
}

const slice = (raw: string, field: Field) => raw.slice(field.start - 1, field.end)

export function validateRemessa(content: string): ValidationReport {
  const issues: FileIssue[] = []
  const add = (line: number, severity: Severity, message: string, field?: string): FileIssue => {
    const issue = { line, field, severity, message }
    issues.push(issue)
    return issue
  }

  // Line endings.
  if (content.trim() === '') {
    add(0, 'erro', 'Arquivo vazio.')
    return { lines: [], issues, lotes: [], totalCents: 0, ok: false }
  }
  const hasCrlf = content.includes('\r\n')
  const hasBareLf = /(^|[^\r])\n/.test(content)
  if (!hasCrlf) add(0, 'aviso', 'As linhas terminam só com LF. O padrão bancário é CRLF (\\r\\n); vários bancos rejeitam LF.')
  else if (hasBareLf) add(0, 'erro', 'O arquivo mistura finais de linha CRLF e LF.')
  if (/[^\x20-\x7e\r\n]/.test(content)) {
    add(0, 'erro', 'O arquivo tem caracteres fora do ASCII (acentos, ç, tabs). Bancos costumam rejeitar; use só letras sem acento.')
  }

  const rawLines = content.split(/\r?\n/)
  while (rawLines.length && rawLines[rawLines.length - 1] === '') rawLines.pop()

  const lines: ParsedLine[] = rawLines.map((raw, i) => {
    const line = i + 1
    const kind = raw.length === LINE_LENGTH ? detectKind(raw) : detectKind(raw.padEnd(LINE_LENGTH))
    if (raw.length !== LINE_LENGTH) add(line, 'erro', `A linha tem ${raw.length} posições; o CNAB 240 exige exatamente 240.`)
    if (!kind) add(line, 'erro', `Tipo de registro não reconhecido (posição 8 = "${raw[7] ?? ''}", posição 14 = "${raw[13] ?? ''}").`)
    const fields: ParsedField[] = kind
      ? LAYOUT[kind].map((field) => {
          const value = slice(raw.padEnd(LINE_LENGTH), field)
          return { field, value, issue: checkField(field, value, kind, line, add) }
        })
      : []
    return { line, raw, kind, fields }
  })

  const value = (l: ParsedLine, key: string) => l.fields.find((f) => f.field.key === key)?.value ?? ''
  const flag = (l: ParsedLine, key: string, message: string, severity: Severity = 'erro') => {
    const issue = add(l.line, severity, message, key)
    const pf = l.fields.find((f) => f.field.key === key)
    if (pf && !pf.issue) pf.issue = issue
  }

  // Structure: 0, then lotes of 1 (3...) 5, then 9.
  const first = lines[0]
  const last = lines[lines.length - 1]
  if (first?.kind !== 'headerArquivo') add(1, 'erro', 'A primeira linha precisa ser o header de arquivo (tipo de registro 0).')
  if (last?.kind !== 'trailerArquivo') add(last?.line ?? 0, 'erro', 'A última linha precisa ser o trailer de arquivo (tipo de registro 9).')
  const banco = first?.kind === 'headerArquivo' ? value(first, 'banco') : ''

  if (first?.kind === 'headerArquivo') {
    const doc = value(first, 'inscricao')
    checkDocument(first, value(first, 'tipoInscricao'), doc, flag, 'da empresa')
    if (!value(first, 'convenio').trim()) flag(first, 'convenio', 'Convênio vazio. A maioria dos bancos exige o código do convênio.', 'aviso')
  }

  const lotes: LoteReport[] = []
  let current: { header: ParsedLine; lote: string; forma: string; details: ParsedLine[]; expectSeq: number; cents: number; lastA?: ParsedLine } | null = null
  let loteCount = 0

  for (const l of lines) {
    if (!l.kind) continue
    if (banco && value(l, 'banco') !== banco) flag(l, 'banco', `Código do banco ${value(l, 'banco')} diferente do header de arquivo (${banco}).`)

    switch (l.kind) {
      case 'headerArquivo':
        if (l !== first) add(l.line, 'erro', 'Header de arquivo repetido no meio do arquivo.')
        break
      case 'headerLote': {
        if (current) add(l.line, 'erro', `Lote ${current.lote} não foi fechado com um trailer de lote antes deste header.`)
        loteCount++
        const lote = value(l, 'lote')
        if (Number(lote) !== loteCount) flag(l, 'lote', `Número do lote ${lote}; esperado ${String(loteCount).padStart(4, '0')} (sequencial a partir de 0001).`)
        const forma = value(l, 'formaLancamento')
        checkDocument(l, value(l, 'tipoInscricao'), value(l, 'inscricao'), flag, 'da empresa')
        current = { header: l, lote, forma, details: [], expectSeq: 1, cents: 0 }
        break
      }
      case 'segmentoA':
      case 'segmentoB': {
        if (!current) {
          add(l.line, 'erro', 'Registro de detalhe fora de um lote.')
          break
        }
        if (value(l, 'lote') !== current.lote) flag(l, 'lote', `Lote ${value(l, 'lote')} dentro do lote ${current.lote}.`)
        if (Number(value(l, 'sequencial')) !== current.expectSeq) {
          flag(l, 'sequencial', `Sequencial ${value(l, 'sequencial')}; esperado ${String(current.expectSeq).padStart(5, '0')}. A numeração corre por todos os segmentos do lote.`)
        }
        current.expectSeq++
        current.details.push(l)
        if (l.kind === 'segmentoA') {
          if (current.lastA) add(current.lastA.line, 'erro', 'Segmento A sem o segmento B que deve vir logo depois.')
          current.lastA = l
          checkSegmentA(l, current.forma, banco, value, flag)
          const cents = Number(value(l, 'valor'))
          if (Number.isFinite(cents)) current.cents += cents
        } else {
          if (!current.lastA) add(l.line, 'erro', 'Segmento B sem um segmento A antes.')
          checkDocument(l, value(l, 'tipoInscricao'), value(l, 'inscricao'), flag, 'do favorecido')
          const ispb = value(l, 'ispb')
          if (current.lastA && value(current.lastA, 'camara') === '988' && /^0+$/.test(ispb)) {
            flag(l, 'ispb', 'Câmara 988 (TED por ISPB) exige o código ISPB do banco do favorecido.')
          }
          current.lastA = undefined
        }
        break
      }
      case 'trailerLote': {
        if (!current) {
          add(l.line, 'erro', 'Trailer de lote sem header de lote.')
          break
        }
        if (current.lastA) add(current.lastA.line, 'erro', 'Segmento A sem o segmento B que deve vir logo depois.')
        if (value(l, 'lote') !== current.lote) flag(l, 'lote', `Trailer do lote ${value(l, 'lote')} fecha o lote ${current.lote}.`)
        const expected = current.details.length + 2
        if (Number(value(l, 'quantidadeRegistros')) !== expected) {
          flag(l, 'quantidadeRegistros', `Quantidade de registros do lote ${Number(value(l, 'quantidadeRegistros'))}; contei ${expected} (header + detalhes + trailer).`)
        }
        if (Number(value(l, 'somaValores')) !== current.cents) {
          flag(l, 'somaValores', `Somatória ${formatBRL(Number(value(l, 'somaValores')) || 0)}; a soma dos segmentos A dá ${formatBRL(current.cents)}.`)
        }
        lotes.push({ lote: current.lote, forma: current.forma, payments: current.details.filter((d) => d.kind === 'segmentoA').length, cents: current.cents })
        current = null
        break
      }
      case 'trailerArquivo': {
        if (current) add(l.line, 'erro', `Lote ${current.lote} não foi fechado com um trailer de lote.`)
        if (Number(value(l, 'quantidadeLotes')) !== loteCount) {
          flag(l, 'quantidadeLotes', `Quantidade de lotes ${Number(value(l, 'quantidadeLotes'))}; o arquivo tem ${loteCount}.`)
        }
        if (Number(value(l, 'quantidadeRegistros')) !== lines.length) {
          flag(l, 'quantidadeRegistros', `Quantidade de registros ${Number(value(l, 'quantidadeRegistros'))}; o arquivo tem ${lines.length} linhas.`)
        }
        break
      }
    }
  }

  issues.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === 'erro' ? -1 : 1))
  return {
    lines,
    issues,
    lotes,
    totalCents: lotes.reduce((s, l) => s + l.cents, 0),
    ok: !issues.some((i) => i.severity === 'erro'),
  }
}

type Add = (line: number, severity: Severity, message: string, field?: string) => FileIssue
type Flag = (l: ParsedLine, key: string, message: string, severity?: Severity) => void

const DATE_FIELDS = new Set(['dataGeracao', 'dataPagamento'])

function checkField(field: Field, value: string, kind: RecordKind, line: number, add: Add): FileIssue | undefined {
  const where = `${field.label} (${field.start}-${field.end}, ${RECORD_NAMES[kind]})`
  if (field.type === 'num' && !/^\d+$/.test(value)) {
    return add(line, 'erro', `${where}: campo numérico com "${value}". Numéricos levam só dígitos, alinhados à direita com zeros.`, field.key)
  }
  if (field.constant !== undefined && value !== field.constant.padEnd(field.end - field.start + 1, ' ')) {
    return add(line, 'erro', `${where}: esperado "${field.constant}", encontrado "${value}".`, field.key)
  }
  if (field.type === 'alfa' && /[a-z]/.test(value)) {
    return add(line, 'aviso', `${where}: letras minúsculas. Muitos bancos exigem maiúsculas.`, field.key)
  }
  if (field.type === 'alfa' && value.length && value[0] === ' ' && value.trim() !== '') {
    return add(line, 'aviso', `${where}: texto começa com espaço. Campos alfanuméricos são alinhados à esquerda.`, field.key)
  }
  if (DATE_FIELDS.has(field.key) && !fromCnabDate(value)) {
    return add(line, 'erro', `${where}: data inválida "${value}" (formato DDMMAAAA).`, field.key)
  }
  return undefined
}

function checkDocument(l: ParsedLine, tipo: string, inscricao: string, flag: Flag, whose: string) {
  const v = inscricao.trim().toUpperCase()
  if (tipo === '1') {
    const cpf = v.slice(-11)
    if (!/^0{3}/.test(v) || !isValidCpf(cpf)) flag(l, 'inscricao', `CPF ${whose} inválido: ${v}.`)
  } else if (tipo === '2') {
    if (!isValidCnpj(v)) flag(l, 'inscricao', `CNPJ ${whose} inválido: ${v}.`)
  } else if (tipo !== '0') {
    flag(l, 'tipoInscricao', `Tipo de inscrição ${whose} "${tipo}": use 1 (CPF) ou 2 (CNPJ).`)
  }
}

function checkSegmentA(l: ParsedLine, forma: string, banco: string, value: (l: ParsedLine, key: string) => string, flag: Flag) {
  const camara = value(l, 'camara')
  const fav = value(l, 'bancoFavorecido')
  if (forma === '01' && fav !== banco) flag(l, 'bancoFavorecido', `Lote de crédito em conta (forma 01) com favorecido do banco ${fav}. Crédito em conta é só para contas do próprio banco ${banco}; para outros bancos use TED (forma 41 ou 43).`)
  if (forma === '01' && camara !== '000') flag(l, 'camara', `Crédito em conta usa câmara 000; encontrado ${camara}.`, 'aviso')
  if ((forma === '41' || forma === '43' || forma === '03') && camara !== '018' && camara !== '988') {
    flag(l, 'camara', `TED usa câmara 018 (ou 988 com ISPB); encontrado ${camara}.`)
  }
  if ((forma === '41' || forma === '43') && !value(l, 'finalidadeTed').trim()) {
    flag(l, 'finalidadeTed', 'TED sem código de finalidade. Muitos bancos exigem; confira o manual do seu banco.', 'aviso')
  }
  if (Number(value(l, 'valor')) === 0) flag(l, 'valor', 'Valor do pagamento zerado.')
  const data = fromCnabDate(value(l, 'dataPagamento'))
  if (data) {
    const weekday = new Date(Date.UTC(data.year, data.month - 1, data.day)).getUTCDay()
    if (weekday === 0 || weekday === 6) flag(l, 'dataPagamento', 'Data de pagamento num fim de semana.', 'aviso')
  }
}
