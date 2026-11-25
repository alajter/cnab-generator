import './styles.css'
import {
  BANKS,
  COLUMN_LABELS,
  FORMA_LABELS,
  RECORD_NAMES,
  formatBRL,
  formatDateBR,
  generateRemessa,
  parseCsv,
  readPayments,
  validatePayer,
  validateRemessa,
  type FileIssue,
  type GenerateResult,
  type ParsedLine,
  type Payer,
  type ReadResult,
  type ValidationReport,
} from '../src/core'
import { clear, download, h, store } from './dom'

const FORMA_NAMES: Record<string, string> = { ...FORMA_LABELS, '03': 'TED', '05': 'Crédito em conta poupança', '45': 'Pix transferência', '47': 'Pix' }
const PAYER_KEY = 'cnab-generator:pagador'

const EXAMPLE_CSV = `nome;cpf_cnpj;banco;agencia;conta;valor;data_pagamento;seu_numero
João da Silva;529.982.247-25;341;0001;12345-6;2.500,75;{D};NF 1021
Maria Souza ME;11.444.777/0001-61;237;3456;98765-4;1.400,00;{D};NF 1022
Distribuidora Alfa Ltda;12.ABC.345/01DE-35;001;4321;55443-2;12.980,10;{D};NF 1023
Transportes Rápido;45.723.174/0001-10;104;0420;00012345-9;1.234,00;{D};NF 1024`

const EXAMPLE_PAYER: Payer = {
  banco: '341',
  documento: '11.222.333/0001-81',
  nome: 'Padaria Pão Quente Ltda',
  convenio: '123456',
  agencia: '1234',
  conta: '56789',
  contaDv: '0',
  servico: '20',
  finalidadeTed: '00005',
}

/* ---------- tabs ---------- */

const tabs = { gerar: document.getElementById('tab-gerar')!, validar: document.getElementById('tab-validar')! }
const panels = { gerar: document.getElementById('panel-gerar')!, validar: document.getElementById('panel-validar')! }

function showTab(name: keyof typeof tabs) {
  for (const key of Object.keys(tabs) as (keyof typeof tabs)[]) {
    tabs[key].setAttribute('aria-selected', String(key === name))
    panels[key].hidden = key !== name
  }
  history.replaceState(null, '', name === 'validar' ? '#validar' : location.pathname)
}
tabs.gerar.addEventListener('click', () => showTab('gerar'))
tabs.validar.addEventListener('click', () => showTab('validar'))

/* ---------- shared bits ---------- */

function dropzone(label: string, accept: string, onFile: (file: File) => void, extra?: Node) {
  const input = h('input', { type: 'file', accept, class: 'sr-only', id: `file-${accept.replace(/\W/g, '')}` }) as HTMLInputElement
  input.addEventListener('change', () => input.files?.[0] && onFile(input.files[0]))
  const zone = h(
    'label',
    { class: 'drop', for: input.id },
    input,
    h('span', { class: 'drop-title' }, label),
    h('span', { class: 'muted' }, 'Arraste aqui ou clique para escolher'),
    extra ?? null,
  )
  zone.addEventListener('dragover', (e) => {
    e.preventDefault()
    zone.classList.add('over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('over'))
  zone.addEventListener('drop', (e) => {
    e.preventDefault()
    zone.classList.remove('over')
    const file = e.dataTransfer?.files[0]
    if (file) onFile(file)
  })
  return zone
}

const badge = (severity: 'erro' | 'aviso' | 'ok', text: string) => h('span', { class: `badge ${severity}` }, text)

function stat(label: string, value: string) {
  return h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, value))
}

function isoDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function nextBusinessDay() {
  const d = new Date()
  do d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6)
  return d
}

/* ---------- Gerar ---------- */

let sheet: ReadResult | null = null
let sheetName = ''
let generated: GenerateResult | null = null

const payerFields: { key: keyof Payer; label: string; hint?: string; width?: 'sm' | 'md' | 'lg'; placeholder?: string }[] = [
  { key: 'banco', label: 'Banco', hint: 'Código COMPE do banco que vai debitar', width: 'sm', placeholder: '341' },
  { key: 'documento', label: 'CNPJ ou CPF', width: 'md', placeholder: '11.222.333/0001-81' },
  { key: 'nome', label: 'Razão social', width: 'lg' },
  { key: 'convenio', label: 'Convênio', hint: 'Código que o banco fornece ao contratar o serviço de pagamentos', width: 'md' },
  { key: 'agencia', label: 'Agência', width: 'sm' },
  { key: 'agenciaDv', label: 'DV', width: 'sm' },
  { key: 'conta', label: 'Conta corrente', width: 'sm' },
  { key: 'contaDv', label: 'DV', width: 'sm' },
  { key: 'finalidadeTed', label: 'Finalidade da TED', hint: 'Opcional. Código de 5 posições da tabela do seu banco', width: 'sm' },
]

function readPayer(form: HTMLFormElement): Payer {
  const data = new FormData(form)
  const get = (k: string) => String(data.get(k) ?? '').trim()
  return {
    banco: get('banco'),
    documento: get('documento'),
    nome: get('nome'),
    convenio: get('convenio'),
    agencia: get('agencia'),
    agenciaDv: get('agenciaDv').toUpperCase(),
    conta: get('conta'),
    contaDv: get('contaDv').toUpperCase(),
    finalidadeTed: get('finalidadeTed'),
    servico: (get('servico') || '20') as Payer['servico'],
  }
}

function fillPayer(form: HTMLFormElement, payer: Partial<Payer>) {
  for (const [k, v] of Object.entries(payer)) {
    const el = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null
    if (el && v !== undefined) el.value = String(v)
  }
}

function renderGerar() {
  const banks = h('datalist', { id: 'banks' }, Object.entries(BANKS).map(([code, name]) => h('option', { value: code }, name)))
  const form = h(
    'form',
    { class: 'payer', autocomplete: 'off' },
    banks,
    payerFields.map((f) =>
      h(
        'label',
        { class: `field ${f.width ?? 'md'}` },
        h('span', { class: 'field-label' }, f.label),
        h('input', { name: f.key, placeholder: f.placeholder, list: f.key === 'banco' ? 'banks' : undefined, inputmode: ['banco', 'agencia', 'conta'].includes(f.key) ? 'numeric' : undefined }),
        f.hint ? h('span', { class: 'field-hint' }, f.hint) : null,
      ),
    ),
    h(
      'label',
      { class: 'field md' },
      h('span', { class: 'field-label' }, 'Tipo de serviço'),
      h(
        'select',
        { name: 'servico' },
        h('option', { value: '20' }, '20 · Pagamento a fornecedores'),
        h('option', { value: '30' }, '30 · Pagamento de salários'),
        h('option', { value: '98' }, '98 · Pagamentos diversos'),
      ),
    ),
    h(
      'label',
      { class: 'field sm' },
      h('span', { class: 'field-label' }, 'Nº do arquivo (NSA)'),
      h('input', { name: 'nsa', type: 'number', min: '1', max: '999999', value: '1' }),
      h('span', { class: 'field-hint' }, 'Aumente a cada envio'),
    ),
  ) as HTMLFormElement

  const saved = store.get<Payer & { nsa?: string }>(PAYER_KEY)
  if (saved) fillPayer(form, saved)
  const payerStatus = h('p', { class: 'payer-status muted' })
  const updatePayer = () => {
    const payer = readPayer(form)
    store.set(PAYER_KEY, { ...payer, nsa: (form.elements.namedItem('nsa') as HTMLInputElement).value })
    const problems = validatePayer(payer)
    const empty = Object.values(payer).every((v) => !v || v === '20')
    clear(payerStatus, empty ? 'Preencha os dados da conta que vai ser debitada, ou clique em "Usar dados de exemplo" abaixo.' : problems.length ? problems.join(' ') : 'Dados do pagador completos. Ficam salvos só neste navegador.')
    payerStatus.classList.toggle('warn', !empty && problems.length > 0)
    renderResult()
  }
  form.addEventListener('input', updatePayer)

  const sheetArea = h('div', { class: 'sheet-area' })
  const resultArea = h('div', { class: 'result-area' })

  const loadExample = () => {
    if (!readPayer(form).convenio) fillPayer(form, EXAMPLE_PAYER)
    updatePayer()
    const csv = EXAMPLE_CSV.replaceAll('{D}', isoDate(nextBusinessDay()))
    setSheet('exemplo.csv', parseCsv(csv))
  }

  const template = () => {
    const header = Object.values(COLUMN_LABELS).join(';')
    const row = ['Nome do favorecido', '529.982.247-25', '341', '0001', '', '12345', '6', '1.234,56', isoDate(nextBusinessDay()), 'NF 123', '', ''].join(';')
    download('modelo-pagamentos.csv', '﻿' + header + '\r\n' + row + '\r\n', 'text/csv')
  }

  async function onSheetFile(file: File) {
    const name = file.name.toLowerCase()
    try {
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        setSheet(file.name, parseCsv(await file.text()))
      } else {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(await file.arrayBuffer())
        setSheet(file.name, XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true }))
      }
    } catch (e) {
      clear(sheetArea, h('p', { class: 'callout erro' }, `Não consegui ler ${file.name}: ${(e as Error).message}`))
    }
  }

  function setSheet(name: string, rows: Record<string, unknown>[]) {
    sheetName = name
    sheet = readPayments(rows)
    renderSheet()
    renderResult()
  }

  function renderSheet() {
    if (!sheet) return
    const errors = sheet.issues.filter((i) => i.severity === 'erro')
    const warnings = sheet.issues.filter((i) => i.severity === 'aviso')
    const byRow = new Map<number, typeof sheet.issues>()
    for (const i of sheet.issues) byRow.set(i.row, [...(byRow.get(i.row) ?? []), i])
    const okRows = new Set(sheet.payments.map((p) => p.row))

    clear(
      sheetArea,
      h(
        'div',
        { class: 'sheet-head' },
        h('strong', {}, sheetName),
        h('span', { class: 'muted' }, `${sheet.payments.length} pagamento(s) prontos`),
        errors.length ? badge('erro', `${errors.length} erro(s)`) : null,
        warnings.length ? badge('aviso', `${warnings.length} aviso(s)`) : null,
        sheet.ignoredColumns.length ? h('span', { class: 'muted' }, `Colunas ignoradas: ${sheet.ignoredColumns.join(', ')}`) : null,
      ),
      sheet.issues.length
        ? h(
            'ul',
            { class: 'issues' },
            sheet.issues.map((i) =>
              h('li', { class: i.severity }, badge(i.severity, i.severity), h('span', { class: 'where' }, `Linha ${i.row}${i.column ? ` · ${i.column}` : ''}`), h('span', {}, i.message)),
            ),
          )
        : null,
      sheet.payments.length
        ? h(
            'div',
            { class: 'table-scroll' },
            h(
              'table',
              {},
              h('thead', {}, h('tr', {}, ['Linha', 'Favorecido', 'CPF/CNPJ', 'Banco', 'Agência', 'Conta', 'Data', 'Valor'].map((t) => h('th', {}, t)))),
              h(
                'tbody',
                {},
                sheet.payments.map((p) =>
                  h(
                    'tr',
                    { class: byRow.has(p.row) ? 'has-warning' : '' },
                    h('td', { class: 'num' }, p.row),
                    h('td', {}, p.nome),
                    h('td', { class: 'mono' }, p.documento.value),
                    h('td', { class: 'mono' }, p.banco),
                    h('td', { class: 'mono' }, p.agencia + (p.agenciaDv ? `-${p.agenciaDv}` : '')),
                    h('td', { class: 'mono' }, p.conta + (p.contaDv ? `-${p.contaDv}` : '')),
                    h('td', { class: 'mono' }, formatDateBR(p.data)),
                    h('td', { class: 'num mono' }, formatBRL(p.cents)),
                  ),
                ),
              ),
            ),
          )
        : null,
      errors.length && okRows.size ? h('p', { class: 'muted' }, 'Linhas com erro ficam fora da tabela. Corrija a planilha e carregue de novo.') : null,
    )
  }

  function renderResult() {
    generated = null
    if (!sheet) {
      clear(resultArea)
      return
    }
    const payer = readPayer(form)
    const payerProblems = validatePayer(payer)
    const sheetErrors = sheet.issues.filter((i) => i.severity === 'erro').length
    const blocked = payerProblems.length > 0 || sheetErrors > 0 || sheet.payments.length === 0
    const button = h('button', { class: 'primary', disabled: blocked }, 'Gerar remessa')
    const why = payerProblems.length ? 'Complete os dados do pagador.' : sheetErrors ? `Corrija ${sheetErrors} erro(s) da planilha para gerar.` : ''

    button.addEventListener('click', () => {
      const nsa = Number((form.elements.namedItem('nsa') as HTMLInputElement).value || 1)
      try {
        generated = generateRemessa(payer, sheet!.payments, { nsa })
      } catch (e) {
        clear(resultArea, h('p', { class: 'callout erro' }, (e as Error).message))
        return
      }
      const fileName = `remessa-${payer.banco.padStart(3, '0')}-${String(nsa).padStart(6, '0')}.rem`
      const report = validateRemessa(generated.content)
      clear(
        resultArea,
        h(
          'div',
          { class: 'result' },
          h('div', { class: 'stats' }, stat('Pagamentos', String(sheet!.payments.length)), stat('Lotes', String(generated.lotes.length)), stat('Total', formatBRL(generated.totalCents)), stat('Linhas', String(generated.lineCount))),
          h(
            'ul',
            { class: 'lotes' },
            generated.lotes.map((l) => h('li', {}, h('span', { class: 'mono' }, `Lote ${l.lote}`), h('span', {}, FORMA_LABELS[l.forma]), h('span', { class: 'muted' }, `${l.payments} pagamento(s)`), h('span', { class: 'mono' }, formatBRL(l.cents)))),
          ),
          generated.notes.map((n) => h('p', { class: 'callout aviso' }, n)),
          h('p', { class: report.ok ? 'callout ok' : 'callout erro' }, report.ok ? 'O validador conferiu o arquivo: estrutura, totais, contagens e documentos.' : 'O validador encontrou problemas no arquivo gerado. Abra no validador para ver.'),
          h(
            'div',
            { class: 'actions' },
            h('button', { class: 'primary', onclick: () => download(fileName, generated!.content) }, `Baixar ${fileName}`),
            h(
              'button',
              {
                onclick: () => {
                  showValidation(fileName, generated!.content)
                  showTab('validar')
                  window.scrollTo({ top: (document.querySelector('.tabs') as HTMLElement).offsetTop - 16, behavior: 'smooth' })
                },
              },
              'Ver campo a campo',
            ),
          ),
        ),
      )
    })

    clear(resultArea, h('div', { class: 'actions' }, button, why ? h('span', { class: 'muted' }, why) : null))
  }

  clear(
    panels.gerar,
    h('div', { class: 'step' }, h('h2', {}, h('span', { class: 'step-n' }, '1'), 'Quem paga'), form, payerStatus),
    h(
      'div',
      { class: 'step' },
      h('h2', {}, h('span', { class: 'step-n' }, '2'), 'Planilha de pagamentos'),
      h(
        'p',
        { class: 'muted' },
        'CSV ou Excel com as colunas nome, cpf_cnpj, banco, agencia, conta, valor e data_pagamento. Opcionais: agencia_dv, conta_dv, seu_numero, finalidade_ted, ispb.',
      ),
      dropzone('Planilha (.xlsx ou .csv)', '.csv,.xlsx,.xls,.txt', onSheetFile),
      h('div', { class: 'actions small' }, h('button', { type: 'button', onclick: template }, 'Baixar modelo'), h('button', { type: 'button', onclick: loadExample }, 'Usar dados de exemplo')),
      sheetArea,
    ),
    h('div', { class: 'step' }, h('h2', {}, h('span', { class: 'step-n' }, '3'), 'Arquivo de remessa'), resultArea),
  )
  updatePayer()
}

/* ---------- Validar ---------- */

const validateArea = h('div', { class: 'validate-area' })

function lineTag(l: ParsedLine) {
  const map: Record<string, string> = { headerArquivo: 'HA', headerLote: 'HL', segmentoA: 'A', segmentoB: 'B', trailerLote: 'TL', trailerArquivo: 'TA' }
  return l.kind ? map[l.kind] : '?'
}

function showValidation(name: string, content: string) {
  const report: ValidationReport = validateRemessa(content)
  const errors = report.issues.filter((i) => i.severity === 'erro')
  const warnings = report.issues.filter((i) => i.severity === 'aviso')
  const issuesByLine = new Map<number, FileIssue[]>()
  for (const i of report.issues) issuesByLine.set(i.line, [...(issuesByLine.get(i.line) ?? []), i])

  const detail = h('div', { class: 'line-detail' })
  const viewer = h('ol', { class: 'viewer' })
  let selected: HTMLElement | null = null

  function select(lineNo: number, fieldKey?: string) {
    const l = report.lines[lineNo - 1]
    if (!l) return
    selected?.classList.remove('selected')
    selected = viewer.children[lineNo - 1] as HTMLElement
    selected?.classList.add('selected')
    selected?.scrollIntoView({ block: 'nearest' })
    clear(
      detail,
      h('h3', {}, `Linha ${l.line} · ${l.kind ? RECORD_NAMES[l.kind] : 'registro desconhecido'}`),
      (issuesByLine.get(l.line) ?? []).filter((i) => !i.field).map((i) => h('p', { class: `callout ${i.severity}` }, i.message)),
      l.fields.length
        ? h(
            'div',
            { class: 'table-scroll' },
            h(
              'table',
              { class: 'fields' },
              h('thead', {}, h('tr', {}, ['Posição', 'Campo', 'Valor', 'Nota', ''].map((t) => h('th', {}, t)))),
              h(
                'tbody',
                {},
                l.fields.map((f) =>
                  h(
                    'tr',
                    { class: [f.issue ? f.issue.severity : '', f.field.key === fieldKey ? 'focus' : ''].join(' ') },
                    h('td', { class: 'mono nowrap' }, `${f.field.start}–${f.field.end}`),
                    h('td', {}, f.field.label, f.issue ? h('div', { class: 'field-issue' }, f.issue.message) : null),
                    h('td', { class: 'mono value' }, f.value.replace(/ /g, '·')),
                    h('td', { class: 'mono muted' }, f.field.note ?? ''),
                    h('td', {}, f.issue ? badge(f.issue.severity, f.issue.severity) : ''),
                  ),
                ),
              ),
            ),
          )
        : h('p', { class: 'muted' }, 'Sem campos para mostrar: o tipo de registro não foi reconhecido.'),
    )
  }

  for (const l of report.lines) {
    const lineIssues = issuesByLine.get(l.line) ?? []
    const sev = lineIssues.some((i) => i.severity === 'erro') ? 'erro' : lineIssues.length ? 'aviso' : ''
    const item = h(
      'li',
      { class: `vline ${sev}`, tabindex: '0', role: 'button', 'aria-label': `Linha ${l.line}` },
      h('span', { class: 'vnum' }, l.line),
      h('span', { class: `vtag ${l.kind ?? 'unknown'}` }, lineTag(l)),
      h('code', {}, l.raw.replace(/ /g, '·')),
    )
    item.addEventListener('click', () => select(l.line))
    item.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(l.line)))
    viewer.append(item)
  }

  clear(
    validateArea,
    h(
      'div',
      { class: 'sheet-head' },
      h('strong', {}, name),
      report.ok ? badge('ok', 'Sem erros') : badge('erro', `${errors.length} erro(s)`),
      warnings.length ? badge('aviso', `${warnings.length} aviso(s)`) : null,
    ),
    h(
      'div',
      { class: 'stats' },
      stat('Linhas', String(report.lines.length)),
      stat('Lotes', String(report.lotes.length)),
      stat('Pagamentos', String(report.lotes.reduce((s, l) => s + l.payments, 0))),
      stat('Total', formatBRL(report.totalCents)),
    ),
    report.lotes.length
      ? h('ul', { class: 'lotes' }, report.lotes.map((l) => h('li', {}, h('span', { class: 'mono' }, `Lote ${Number(l.lote)}`), h('span', {}, `${l.forma} · ${FORMA_NAMES[l.forma] ?? 'forma não suportada aqui'}`), h('span', { class: 'muted' }, `${l.payments} pagamento(s)`), h('span', { class: 'mono' }, formatBRL(l.cents)))))
      : null,
    report.issues.length
      ? h(
          'ul',
          { class: 'issues clickable' },
          report.issues.map((i) => {
            const li = h('li', { class: i.severity, tabindex: i.line ? '0' : undefined }, badge(i.severity, i.severity), h('span', { class: 'where' }, i.line ? `Linha ${i.line}` : 'Arquivo'), h('span', {}, i.message))
            if (i.line) {
              li.addEventListener('click', () => select(i.line, i.field))
              li.addEventListener('keydown', (e) => e.key === 'Enter' && select(i.line, i.field))
            }
            return li
          }),
        )
      : null,
    h('p', { class: 'muted' }, 'Clique numa linha para ver cada campo. Espaços aparecem como ·'),
    h('div', { class: 'viewer-scroll' }, viewer),
    detail,
  )
  select(report.issues.find((i) => i.line > 0)?.line ?? 1, report.issues.find((i) => i.line > 0)?.field)
}

function renderValidar() {
  const paste = h('textarea', { class: 'paste', rows: '4', placeholder: 'Ou cole o conteúdo do arquivo aqui', spellcheck: 'false' }) as HTMLTextAreaElement
  paste.addEventListener('input', () => paste.value.trim() && showValidation('conteúdo colado', paste.value))
  clear(
    panels.validar,
    h(
      'div',
      { class: 'step' },
      h('h2', {}, 'Validar um arquivo de remessa'),
      h('p', { class: 'muted' }, 'Confere tamanho das linhas, finais de linha, estrutura de lotes, sequenciais, totais, CPF/CNPJ, datas e campos numéricos, com a posição exata de cada problema.'),
      dropzone(
        'Arquivo .rem, .txt ou .ret',
        '.rem,.txt,.ret,.REM,.TXT',
        async (file) => {
          const buf = await file.arrayBuffer()
          showValidation(file.name, new TextDecoder('latin1').decode(buf))
        },
      ),
      paste,
      validateArea,
    ),
  )
}

renderGerar()
renderValidar()
if (location.hash === '#validar') showTab('validar')
