import { bankName } from './banks'
import { toCnabDate, type CalendarDate } from './dates'
import { inscricaoField, parseDocument } from './documents'
import type { Payment } from './input'
import { DEFAULT_VERSAO_ARQUIVO, DEFAULT_VERSAO_LOTE, LAYOUT, LINE_LENGTH, type RecordKind } from './layout'
import { formatField, onlyDigits } from './text'

/** The company paying: the account the bank will debit. */
export interface Payer {
  banco: string
  documento: string
  nome: string
  /** Agreement code the bank gives the company for payment files. Format varies by bank. */
  convenio: string
  agencia: string
  agenciaDv?: string
  conta: string
  contaDv?: string
  /** G025: 20 = pagamento a fornecedores, 30 = pagamento de salários, 98 = pagamentos diversos. */
  servico?: '20' | '30' | '98'
  /** Default TED purpose code (P011) for rows that leave finalidade_ted empty. */
  finalidadeTed?: string
}

export interface GenerateOptions {
  /** NSA, G018: must increase with every file sent to the bank and not repeat in a day. */
  nsa?: number
  generatedAt?: Date
  versaoArquivo?: string
  versaoLote?: string
  /** CRLF unless the bank's manual says otherwise. */
  lineEnding?: '\r\n' | '\n'
}

export type FormaLancamento = '01' | '41' | '43'

export const FORMA_LABELS: Record<FormaLancamento, string> = {
  '01': 'Crédito em conta corrente (mesmo banco)',
  '41': 'TED, outra titularidade',
  '43': 'TED, mesma titularidade',
}

export interface LoteSummary {
  lote: number
  forma: FormaLancamento
  payments: number
  cents: number
}

export interface GenerateResult {
  content: string
  lotes: LoteSummary[]
  totalCents: number
  lineCount: number
  /** Things worth telling the user that do not stop the file. */
  notes: string[]
}

export class PayerError extends Error {}

export function validatePayer(payer: Payer): string[] {
  const problems: string[] = []
  if (!/^\d{1,3}$/.test(onlyDigits(payer.banco)) || !onlyDigits(payer.banco)) problems.push('Código do banco do pagador inválido.')
  if (!parseDocument(payer.documento)) problems.push('CNPJ/CPF do pagador inválido.')
  if (!payer.nome?.trim()) problems.push('Nome da empresa vazio.')
  if (!payer.convenio?.trim()) problems.push('Convênio vazio. O banco informa esse código ao contratar o serviço de pagamentos.')
  if (payer.convenio && payer.convenio.length > 20) problems.push('Convênio tem até 20 caracteres.')
  const ag = onlyDigits(payer.agencia)
  if (!ag || ag.length > 5) problems.push('Agência do pagador inválida (até 5 dígitos).')
  const cc = onlyDigits(payer.conta)
  if (!cc || cc.length > 12) problems.push('Conta do pagador inválida (até 12 dígitos).')
  return problems
}

/** Same bank as the payer: credit in account. Another bank: TED, split by ownership. */
export function formaFor(payment: Payment, payer: Payer, payerDoc: string): FormaLancamento {
  if (payment.banco === onlyDigits(payer.banco).padStart(3, '0')) return '01'
  return payment.documento.value === payerDoc ? '43' : '41'
}

function record(kind: RecordKind, values: Record<string, string | number | undefined>): string {
  const line = LAYOUT[kind].map((field) => formatField(field, values[field.key] ?? field.constant)).join('')
  if (line.length !== LINE_LENGTH) throw new Error(`Bug: registro ${kind} com ${line.length} posições.`)
  return line
}

const pad = (n: number, width: number) => String(n).padStart(width, '0')

export function generateRemessa(payer: Payer, payments: Payment[], options: GenerateOptions = {}): GenerateResult {
  const problems = validatePayer(payer)
  if (problems.length) throw new PayerError(problems.join(' '))
  if (payments.length === 0) throw new Error('Nenhum pagamento válido para gerar o arquivo.')

  const now = options.generatedAt ?? new Date()
  const banco = onlyDigits(payer.banco).padStart(3, '0')
  const doc = parseDocument(payer.documento)!
  const nsa = options.nsa ?? 1
  const eol = options.lineEnding ?? '\r\n'
  const generatedOn: CalendarDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }

  const company = {
    banco,
    tipoInscricao: doc.tipoInscricao,
    inscricao: inscricaoField(doc),
    convenio: payer.convenio.trim(),
    agencia: onlyDigits(payer.agencia),
    agenciaDv: payer.agenciaDv ?? '',
    conta: onlyDigits(payer.conta),
    contaDv: payer.contaDv ?? '',
    agenciaContaDv: '',
    nomeEmpresa: payer.nome,
  }

  const lines: string[] = []
  lines.push(
    record('headerArquivo', {
      ...company,
      nomeBanco: bankName(banco),
      remessaRetorno: '1',
      dataGeracao: toCnabDate(generatedOn),
      horaGeracao: `${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`,
      nsa: String(nsa),
      versaoArquivo: options.versaoArquivo ?? DEFAULT_VERSAO_ARQUIVO,
      densidade: '01600',
    }),
  )

  // Group by forma de lançamento, keeping the spreadsheet order inside each lote.
  const order: FormaLancamento[] = ['01', '41', '43']
  const groups = new Map<FormaLancamento, Payment[]>()
  for (const p of payments) {
    const forma = formaFor(p, payer, doc.value)
    groups.set(forma, [...(groups.get(forma) ?? []), p])
  }

  const lotes: LoteSummary[] = []
  const notes: string[] = []
  let missingFinalidade = 0

  for (const forma of order) {
    const group = groups.get(forma)
    if (!group) continue
    const lote = String(lotes.length + 1)
    let sequencial = 0
    let cents = 0

    lines.push(
      record('headerLote', {
        ...company,
        lote,
        servico: payer.servico ?? '20',
        formaLancamento: forma,
        versaoLote: options.versaoLote ?? DEFAULT_VERSAO_LOTE,
        indicativoFormaPagamento: '01',
      }),
    )

    for (const p of group) {
      const isTed = forma !== '01'
      const finalidadeTed = isTed ? p.finalidadeTed || payer.finalidadeTed || '' : ''
      if (isTed && !finalidadeTed) missingFinalidade++
      cents += p.cents
      lines.push(
        record('segmentoA', {
          banco,
          lote,
          sequencial: String(++sequencial),
          tipoMovimento: '0',
          instrucaoMovimento: '00',
          camara: isTed ? (p.ispb ? '988' : '018') : '000',
          bancoFavorecido: p.banco,
          agencia: p.agencia,
          agenciaDv: p.agenciaDv,
          conta: p.conta,
          contaDv: p.contaDv,
          nomeFavorecido: p.nome,
          seuNumero: p.seuNumero,
          dataPagamento: toCnabDate(p.data),
          quantidadeMoeda: '0',
          valor: String(p.cents),
          dataReal: '0',
          valorReal: '0',
          finalidadeTed,
          aviso: '0',
        }),
      )
      lines.push(
        record('segmentoB', {
          banco,
          lote,
          sequencial: String(++sequencial),
          tipoInscricao: p.documento.tipoInscricao,
          inscricao: inscricaoField(p.documento),
          vencimento: '0',
          valorDocumento: '0',
          abatimento: '0',
          desconto: '0',
          mora: '0',
          multa: '0',
          aviso: '0',
          codigoUg: '0',
          ispb: p.ispb || '0',
        }),
      )
    }

    lines.push(
      record('trailerLote', {
        banco,
        lote,
        quantidadeRegistros: String(sequencial + 2),
        somaValores: String(cents),
        somaQuantidadeMoedas: '0',
        avisoDebito: '0',
      }),
    )
    lotes.push({ lote: Number(lote), forma, payments: group.length, cents })
  }

  lines.push(
    record('trailerArquivo', {
      banco,
      quantidadeLotes: String(lotes.length),
      quantidadeRegistros: String(lines.length + 1),
      quantidadeContas: '0',
    }),
  )

  if (missingFinalidade) {
    notes.push(
      `${missingFinalidade} TED sem código de finalidade. Muitos bancos exigem esse campo (posições 220-224 do segmento A); confira a tabela de finalidades no manual do seu banco.`,
    )
  }

  return {
    content: lines.join(eol) + eol,
    lotes,
    totalCents: lotes.reduce((s, l) => s + l.cents, 0),
    lineCount: lines.length,
    notes,
  }
}
