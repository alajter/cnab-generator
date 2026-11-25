// Prints docs/layout.md from src/core/layout.ts, so the reference can never drift from the code.
import { LAYOUT, MANUAL_VERSION, RECORD_NAMES, DEFAULT_VERSAO_ARQUIVO, DEFAULT_VERSAO_LOTE, type RecordKind } from '../src/core/layout'

const out: string[] = [
  '# Layout reference',
  '',
  `Generated from \`src/core/layout.ts\` by \`npm run docs:layout\`. Do not edit by hand.`,
  '',
  `FEBRABAN CNAB 240 ${MANUAL_VERSION}, section 3.1.2 (payments by credit in account and TED). File layout version \`${DEFAULT_VERSAO_ARQUIVO}\`, lote layout version \`${DEFAULT_VERSAO_LOTE}\`.`,
  'Positions are 1-based and inclusive. `num` fields are right-aligned and zero-filled; `alfa` fields are left-aligned and space-filled. Note codes (G001, P010...) point to the field descriptions in the FEBRABAN manual.',
  '',
]

for (const kind of Object.keys(LAYOUT) as RecordKind[]) {
  out.push(`## ${RECORD_NAMES[kind]}`, '', '| Positions | Size | Type | Field | Fixed value | Note |', '|---|---|---|---|---|---|')
  for (const f of LAYOUT[kind]) {
    const size = f.end - f.start + 1
    const type = f.decimals ? `num (${size - f.decimals},${f.decimals})` : f.type
    out.push(`| ${f.start}-${f.end} | ${size} | ${type} | ${f.label} | ${f.constant ? `\`${f.constant}\`` : ''} | ${f.note ?? ''} |`)
  }
  out.push('')
}

console.log(out.join('\n'))
