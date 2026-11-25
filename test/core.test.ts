import { describe, expect, it } from 'vitest'
import {
  LAYOUT,
  generateRemessa,
  isValidCnpj,
  isValidCpf,
  parseAmount,
  parseCsv,
  parseDate,
  parseDocument,
  readPayments,
  validateRemessa,
  type Payer,
} from '../src/core'

const payer: Payer = {
  banco: '341',
  documento: '11.222.333/0001-81',
  nome: 'Padaria Pão Quente Ltda',
  convenio: '123456',
  agencia: '1234',
  conta: '56789',
  contaDv: '0',
  finalidadeTed: '00005',
}

const today = { year: 2026, month: 11, day: 1 }
const at = new Date(2026, 10, 25, 14, 30, 5)

function rows(...extra: Record<string, string>[]) {
  return [
    { nome: 'João da Silva', cpf_cnpj: '529.982.247-25', banco: '341', agencia: '0001', conta: '12345-6', valor: '2.500,75', data_pagamento: '27/11/2026' },
    { nome: 'Maria Souza ME', cpf_cnpj: '11.444.777/0001-61', banco: '237', agencia: '3456', conta: '98765-4', valor: '1400', data_pagamento: '27/11/2026' },
    ...extra,
  ]
}

const field = (line: string, start: number, end: number) => line.slice(start - 1, end)

describe('layout', () => {
  for (const [kind, fields] of Object.entries(LAYOUT)) {
    it(`${kind} covers positions 1 to 240 with no gap or overlap`, () => {
      let next = 1
      for (const f of fields) {
        expect(f.start, `${kind}.${f.key}`).toBe(next)
        expect(f.end).toBeGreaterThanOrEqual(f.start)
        next = f.end + 1
      }
      expect(next).toBe(241)
    })
  }
})

describe('documents', () => {
  it('validates CPF and CNPJ check digits', () => {
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('52998224724')).toBe(false)
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCnpj('11222333000181')).toBe(true)
    expect(isValidCnpj('11222333000182')).toBe(false)
  })

  it('accepts the alphanumeric CNPJ (Receita Federal example 12.ABC.345/01DE-35)', () => {
    expect(isValidCnpj('12ABC34501DE35')).toBe(true)
    expect(parseDocument('12.abc.345/01de-35')).toEqual({ kind: 'cnpj', value: '12ABC34501DE35', tipoInscricao: '2' })
    expect(isValidCnpj('12ABC34501DE36')).toBe(false)
  })
})

describe('amounts', () => {
  it.each([
    ['2500.75', 250075],
    ['2.500,75', 250075],
    ['2,500.75', 250075],
    ['R$ 1.234.567,89', 123456789],
    ['1234', 123400],
    ['0,5', 50],
    [150.5, 15050],
    [0.1 + 0.2, 30],
  ])('%s is %d centavos', (input, cents) => {
    expect(parseAmount(input)).toEqual({ ok: true, cents })
  })

  it.each(['1.234', '1,234', '1.234.567', '12,345', '-10', '0', 'abc', '1,2345', ''])('rejects %s', (input) => {
    expect(parseAmount(input).ok).toBe(false)
  })
})

describe('dates', () => {
  it('reads calendar days without timezone drift', () => {
    expect(parseDate('2026-01-15')).toEqual({ year: 2026, month: 1, day: 15 })
    expect(parseDate('15/01/2026')).toEqual({ year: 2026, month: 1, day: 15 })
    expect(parseDate('5/1/2026')).toEqual({ year: 2026, month: 1, day: 5 })
    expect(parseDate(46037)).toEqual({ year: 2026, month: 1, day: 15 }) // Excel serial
    expect(parseDate('31/02/2026')).toBeNull()
  })
})

describe('csv', () => {
  it('detects ";" and keeps quoted values', () => {
    const parsed = parseCsv('﻿nome;valor\r\n"Silva; João";"1.234,56"\r\n;\r\n')
    expect(parsed).toEqual([{ nome: 'Silva; João', valor: '1.234,56' }])
  })
})

describe('reading the spreadsheet', () => {
  it('normalizes rows and splits "12345-6" into account and check digit', () => {
    const { payments, issues } = readPayments(rows(), { today })
    expect(issues.filter((i) => i.severity === 'erro')).toEqual([])
    expect(payments[0]).toMatchObject({ nome: 'JOAO DA SILVA', conta: '12345', contaDv: '6', cents: 250075, banco: '341' })
  })

  it('reports every bad cell with its row and column', () => {
    const { payments, issues } = readPayments(
      rows({ nome: '', cpf_cnpj: '123', banco: 'x', agencia: '1', conta: '1-1', valor: '1.234', data_pagamento: '31/02/2026' }),
      { today },
    )
    expect(payments).toHaveLength(2)
    const row4 = issues.filter((i) => i.row === 4 && i.severity === 'erro').map((i) => i.column)
    expect(row4).toEqual(expect.arrayContaining(['nome', 'cpf_cnpj', 'banco', 'valor', 'data_pagamento']))
  })

  it('names missing columns', () => {
    const { issues } = readPayments([{ nome: 'a', valor: '1' }])
    expect(issues[0].message).toContain('cpf_cnpj')
  })

  it('warns about duplicates, past dates and weekends', () => {
    const r = rows()
    const { issues } = readPayments([...r, r[0], { ...r[1], data_pagamento: '28/11/2026' }, { ...r[1], data_pagamento: '01/10/2026' }], { today })
    const messages = issues.map((i) => i.message).join('\n')
    expect(messages).toContain('linha 2')
    expect(messages).toContain('fim de semana')
    expect(messages).toContain('passado')
  })
})

describe('generating the file', () => {
  const { payments } = readPayments(rows(), { today })
  const result = generateRemessa(payer, payments, { nsa: 7, generatedAt: at })
  const lines = result.content.split('\r\n').filter(Boolean)

  it('writes 240-position lines ending in CRLF', () => {
    expect(result.content.endsWith('\r\n')).toBe(true)
    expect(lines.every((l) => l.length === 240)).toBe(true)
  })

  it('splits same-bank credit and TED into separate lotes', () => {
    expect(result.lotes.map((l) => [l.forma, l.payments, l.cents])).toEqual([
      ['01', 1, 250075],
      ['41', 1, 140000],
    ])
    // header arquivo, (header lote, A, B, trailer) x 2, trailer arquivo
    expect(lines.map((l) => l[7] + (l[7] === '3' ? l[13] : ''))).toEqual(['0', '1', '3A', '3B', '5', '1', '3A', '3B', '5', '9'])
  })

  it('places every value at the position the manual gives', () => {
    const [h, hl, a, b, tl] = lines
    expect(field(h, 1, 3)).toBe('341')
    expect(field(h, 19, 32)).toBe('11222333000181')
    expect(field(h, 73, 102)).toBe('PADARIA PAO QUENTE LTDA       ')
    expect(field(h, 144, 157)).toBe('25112026143005')
    expect(field(h, 158, 163)).toBe('000007')
    expect(field(h, 164, 166)).toBe('103')
    expect(field(hl, 12, 13)).toBe('01')
    expect(field(hl, 14, 16)).toBe('046')
    expect(field(a, 9, 13)).toBe('00001')
    expect(field(a, 18, 20)).toBe('000')
    expect(field(a, 30, 42)).toBe('0000000123456')
    expect(field(a, 94, 101)).toBe('27112026')
    expect(field(a, 102, 104)).toBe('BRL')
    expect(field(a, 120, 134)).toBe('000000000250075')
    expect(field(b, 9, 14)).toBe('00002B')
    expect(field(b, 18, 32)).toBe('100052998224725')
    expect(field(tl, 18, 23)).toBe('000004')
    expect(field(tl, 24, 41)).toBe('000000000000250075')
    const ted = lines[6]
    expect(field(ted, 18, 20)).toBe('018')
    expect(field(ted, 220, 224)).toBe('00005')
    expect(field(lines[9], 18, 29)).toBe('000002000010')
  })

  it('uses forma 43 when the payee is the payer itself, and câmara 988 with an ISPB', () => {
    const { payments: p } = readPayments(
      [{ nome: 'Padaria', cpf_cnpj: '11222333000181', banco: '260', agencia: '1', conta: '9-9', valor: '10,00', data_pagamento: '27/11/2026', ispb: '18236120' }],
      { today },
    )
    const out = generateRemessa(payer, p, { generatedAt: at })
    const ls = out.content.split('\r\n')
    expect(out.lotes[0].forma).toBe('43')
    expect(field(ls[2], 18, 20)).toBe('988')
    expect(field(ls[3], 233, 240)).toBe('18236120')
  })

  it('refuses an incomplete payer instead of writing a file the bank rejects', () => {
    expect(() => generateRemessa({ ...payer, convenio: '' }, payments)).toThrow(/Convênio/)
    expect(() => generateRemessa({ ...payer, documento: '123' }, payments)).toThrow(/CNPJ/)
  })
})

describe('validator', () => {
  const { payments } = readPayments(rows(), { today })
  const good = generateRemessa(payer, payments, { generatedAt: at }).content

  it('passes every file the generator writes (500 random payments)', () => {
    const banks = ['341', '001', '237', '104', '260']
    const docs = ['52998224725', '11444777000161', '12ABC34501DE35', '11222333000181']
    let seed = 42
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n)
    const random = Array.from({ length: 500 }, (_, i) => ({
      nome: `Favorecido ${i} ação`,
      cpf_cnpj: docs[rand(docs.length)],
      banco: banks[rand(banks.length)],
      agencia: String(rand(99999)),
      conta: `${rand(999999999)}-${rand(10)}`,
      valor: `${rand(100000)},${String(rand(100)).padStart(2, '0')}`.replace(/^0,00$/, '1,00'),
      data_pagamento: `${String(1 + rand(28)).padStart(2, '0')}/12/2026`,
    }))
    const read = readPayments(random, { today })
    const file = generateRemessa(payer, read.payments, { generatedAt: at })
    const report = validateRemessa(file.content)
    expect(report.issues.filter((i) => i.severity === 'erro')).toEqual([])
    expect(report.totalCents).toBe(file.totalCents)
  })

  it('accepts the sample file with no errors', () => {
    const report = validateRemessa(good)
    expect(report.ok).toBe(true)
    expect(report.lotes).toHaveLength(2)
  })

  it('catches a wrong total, a wrong count, a missing segment B and a short line', () => {
    const ls = good.split('\r\n').filter(Boolean)
    const broken = [...ls]
    broken[4] = broken[4].slice(0, 23) + '000000000000999999' + broken[4].slice(41) // trailer lote total
    broken.splice(3, 1) // drop segment B of lote 1
    broken[1] = broken[1].slice(0, 200) // short line
    const report = validateRemessa(broken.join('\r\n') + '\r\n')
    const text = report.issues.map((i) => i.message).join('\n')
    expect(report.ok).toBe(false)
    expect(text).toContain('exatamente 240')
    expect(text).toContain('sem o segmento B')
    expect(text).toContain('Somatória')
    expect(text).toContain('Quantidade de registros do lote')
    expect(text).toContain('Quantidade de registros 10; o arquivo tem 9')
  })

  it('warns on LF line endings and rejects accents', () => {
    expect(validateRemessa(good.replace(/\r\n/g, '\n')).issues[0].message).toContain('CRLF')
    const accented = good.replace('JOAO DA SILVA', 'JOÃO DA SILVA')
    expect(validateRemessa(accented).issues.some((i) => i.message.includes('ASCII'))).toBe(true)
  })

  it('flags a same-bank lote that pays another bank', () => {
    const ls = good.split('\r\n')
    ls[2] = ls[2].slice(0, 20) + '237' + ls[2].slice(23)
    const report = validateRemessa(ls.join('\r\n'))
    expect(report.issues.some((i) => i.field === 'bancoFavorecido')).toBe(true)
  })
})
