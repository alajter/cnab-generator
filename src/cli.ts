import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import * as XLSX from 'xlsx'
import { RECORD_NAMES, formatBRL, generateRemessa, parseCsv, readPayments, validateRemessa, FORMA_LABELS, type Payer } from './core'

const HELP = `cnab: gera e valida arquivos de remessa CNAB 240 (FEBRABAN v11.0, pagamentos).

Uso:
  cnab gerar <pagamentos.csv|xlsx> --pagador pagador.json [--nsa 1] [--saida remessa.rem]
  cnab validar <remessa.rem>

pagador.json:
  { "banco": "341", "documento": "11.222.333/0001-81", "nome": "Minha Empresa Ltda",
    "convenio": "123456", "agencia": "1234", "conta": "56789", "contaDv": "0",
    "servico": "20", "finalidadeTed": "" }

Planilha: colunas nome, cpf_cnpj, banco, agencia, conta, valor, data_pagamento
(opcionais: agencia_dv, conta_dv, seu_numero, finalidade_ted, ispb).

Saída 0 quando tudo certo, 1 quando há erros.`

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : undefined
}

function readSheet(path: string): Record<string, unknown>[] {
  if (/\.csv$|\.txt$/i.test(path)) return parseCsv(readFileSync(path, 'utf8'))
  const wb = XLSX.read(readFileSync(path))
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
}

function gerar(file: string): number {
  const pagadorPath = arg('--pagador')
  if (!pagadorPath) {
    console.error('Falta --pagador pagador.json. Veja `cnab --help`.')
    return 1
  }
  const payer = JSON.parse(readFileSync(pagadorPath, 'utf8')) as Payer
  const { payments, issues, ignoredColumns } = readPayments(readSheet(file))
  for (const i of issues) console.error(`${i.severity === 'erro' ? 'ERRO ' : 'aviso'}  linha ${i.row}${i.column ? `, ${i.column}` : ''}: ${i.message}`)
  if (ignoredColumns.length) console.error(`aviso  colunas ignoradas: ${ignoredColumns.join(', ')}`)
  if (issues.some((i) => i.severity === 'erro')) {
    console.error('\nCorrija os erros acima; nenhum arquivo foi gerado.')
    return 1
  }
  const result = generateRemessa(payer, payments, { nsa: Number(arg('--nsa') ?? 1) })
  const out = arg('--saida') ?? `remessa-${basename(file).replace(/\.[^.]+$/, '')}.rem`
  writeFileSync(out, result.content, 'latin1')
  for (const l of result.lotes) console.log(`lote ${l.lote}  ${FORMA_LABELS[l.forma]}: ${l.payments} pagamento${l.payments === 1 ? "" : "s"}, ${formatBRL(l.cents)}`)
  for (const n of result.notes) console.error(`aviso  ${n}`)
  console.log(`\n${out}: ${result.lineCount} linhas, total ${formatBRL(result.totalCents)}`)
  return 0
}

function validar(file: string): number {
  const report = validateRemessa(readFileSync(file, 'latin1'))
  for (const i of report.issues) {
    const kind = report.lines[i.line - 1]?.kind
    console.log(`${i.severity === 'erro' ? 'ERRO ' : 'aviso'}  linha ${i.line}${kind ? ` (${RECORD_NAMES[kind]})` : ''}: ${i.message}`)
  }
  for (const l of report.lotes) console.log(`lote ${Number(l.lote)}  forma ${l.forma}: ${l.payments} pagamento${l.payments === 1 ? "" : "s"}, ${formatBRL(l.cents)}`)
  console.log(report.ok ? `\nOK: ${report.lines.length} linhas, total ${formatBRL(report.totalCents)}` : `\n${report.issues.filter((i) => i.severity === 'erro').length} erro(s).`)
  return report.ok ? 0 : 1
}

const [command, file] = process.argv.slice(2)
if (!command || command === '--help' || command === '-h' || !file) {
  console.log(HELP)
  process.exit(command ? 0 : 1)
}
process.exit(command === 'gerar' ? gerar(file) : command === 'validar' ? validar(file) : (console.error(`Comando desconhecido: ${command}\n\n${HELP}`), 1))
