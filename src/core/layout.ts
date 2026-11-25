/**
 * FEBRABAN CNAB 240, layout v11.0 (September 2026), section 3.1.2:
 * "Pagamento através de crédito em conta, cheque, OP, TED, Pix".
 *
 * This file is the single source of truth. The generator writes from it, the validator reads
 * with it, and docs/layout.md is generated from it (`npm run docs:layout`).
 *
 * Positions are 1-based and inclusive, exactly as printed in the manual.
 */

export type FieldType = 'num' | 'alfa'

export interface Field {
  /** Key used by the generator and validator. */
  key: string
  /** Name as it appears in the FEBRABAN manual (Portuguese). */
  label: string
  start: number
  end: number
  type: FieldType
  /** Implied decimal places for numeric amounts. */
  decimals?: number
  /** Fixed value. The validator reports any other value as an error. */
  constant?: string
  /** FEBRABAN note code (G001, P010...), for looking it up in the manual. */
  note?: string
}

export type RecordKind = 'headerArquivo' | 'headerLote' | 'segmentoA' | 'segmentoB' | 'trailerLote' | 'trailerArquivo'

export const RECORD_NAMES: Record<RecordKind, string> = {
  headerArquivo: 'Header de arquivo',
  headerLote: 'Header de lote',
  segmentoA: 'Detalhe, segmento A',
  segmentoB: 'Detalhe, segmento B',
  trailerLote: 'Trailer de lote',
  trailerArquivo: 'Trailer de arquivo',
}

const f = (key: string, label: string, start: number, end: number, type: FieldType, extra: Partial<Field> = {}): Field => ({
  key,
  label,
  start,
  end,
  type,
  ...extra,
})

const blank = (key: string, start: number, end: number): Field =>
  f(key, 'Uso exclusivo FEBRABAN/CNAB', start, end, 'alfa', { note: 'G004' })

export const LAYOUT: Record<RecordKind, Field[]> = {
  headerArquivo: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { constant: '0000', note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '0', note: 'G003' }),
    blank('cnab1', 9, 17),
    f('tipoInscricao', 'Tipo de inscrição da empresa', 18, 18, 'num', { note: 'G005' }),
    f('inscricao', 'Número de inscrição da empresa', 19, 32, 'alfa', { note: 'G006' }),
    f('convenio', 'Código do convênio no banco', 33, 52, 'alfa', { note: 'G007' }),
    f('agencia', 'Agência mantenedora da conta', 53, 57, 'num', { note: 'G008' }),
    f('agenciaDv', 'Dígito verificador da agência', 58, 58, 'alfa', { note: 'G009' }),
    f('conta', 'Número da conta corrente', 59, 70, 'num', { note: 'G010' }),
    f('contaDv', 'Dígito verificador da conta', 71, 71, 'alfa', { note: 'G011' }),
    f('agenciaContaDv', 'Dígito verificador da ag/conta', 72, 72, 'alfa', { note: 'G012' }),
    f('nomeEmpresa', 'Nome da empresa', 73, 102, 'alfa', { note: 'G013' }),
    f('nomeBanco', 'Nome do banco', 103, 132, 'alfa', { note: 'G014' }),
    blank('cnab2', 133, 142),
    f('remessaRetorno', 'Código remessa/retorno', 143, 143, 'num', { note: 'G015' }),
    f('dataGeracao', 'Data de geração do arquivo', 144, 151, 'num', { note: 'G016' }),
    f('horaGeracao', 'Hora de geração do arquivo', 152, 157, 'num', { note: 'G017' }),
    f('nsa', 'Número sequencial do arquivo', 158, 163, 'num', { note: 'G018' }),
    f('versaoArquivo', 'Nº da versão do layout do arquivo', 164, 166, 'num', { note: 'G019' }),
    f('densidade', 'Densidade de gravação do arquivo', 167, 171, 'num', { note: 'G020' }),
    f('reservadoBanco', 'Para uso reservado do banco', 172, 191, 'alfa', { note: 'G021' }),
    f('reservadoEmpresa', 'Para uso reservado da empresa', 192, 211, 'alfa', { note: 'G022' }),
    blank('cnab3', 212, 240),
  ],

  headerLote: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '1', note: 'G003' }),
    f('operacao', 'Tipo da operação', 9, 9, 'alfa', { constant: 'C', note: 'G028' }),
    f('servico', 'Tipo do serviço', 10, 11, 'num', { note: 'G025' }),
    f('formaLancamento', 'Forma de lançamento', 12, 13, 'num', { note: 'G029' }),
    f('versaoLote', 'Nº da versão do layout do lote', 14, 16, 'num', { note: 'G030' }),
    blank('cnab1', 17, 17),
    f('tipoInscricao', 'Tipo de inscrição da empresa', 18, 18, 'num', { note: 'G005' }),
    f('inscricao', 'Número de inscrição da empresa', 19, 32, 'alfa', { note: 'G006' }),
    f('convenio', 'Código do convênio no banco', 33, 52, 'alfa', { note: 'G007' }),
    f('agencia', 'Agência mantenedora da conta', 53, 57, 'num', { note: 'G008' }),
    f('agenciaDv', 'Dígito verificador da agência', 58, 58, 'alfa', { note: 'G009' }),
    f('conta', 'Número da conta corrente', 59, 70, 'num', { note: 'G010' }),
    f('contaDv', 'Dígito verificador da conta', 71, 71, 'alfa', { note: 'G011' }),
    f('agenciaContaDv', 'Dígito verificador da ag/conta', 72, 72, 'alfa', { note: 'G012' }),
    f('nomeEmpresa', 'Nome da empresa', 73, 102, 'alfa', { note: 'G013' }),
    f('mensagem', 'Mensagem', 103, 142, 'alfa', { note: 'G031' }),
    f('logradouro', 'Logradouro', 143, 172, 'alfa', { note: 'G032' }),
    f('numero', 'Número do local', 173, 177, 'num', { note: 'G032' }),
    f('complemento', 'Complemento', 178, 192, 'alfa', { note: 'G032' }),
    f('cidade', 'Cidade', 193, 212, 'alfa', { note: 'G033' }),
    f('cep', 'CEP', 213, 217, 'num', { note: 'G034' }),
    f('cepComplemento', 'Complemento do CEP', 218, 220, 'alfa', { note: 'G035' }),
    f('uf', 'Sigla do estado', 221, 222, 'alfa', { note: 'G036' }),
    f('indicativoFormaPagamento', 'Indicativo da forma de pagamento do serviço', 223, 224, 'num', { note: 'P014' }),
    blank('cnab2', 225, 230),
    f('ocorrencias', 'Códigos das ocorrências p/ retorno', 231, 240, 'alfa', { note: 'G059' }),
  ],

  segmentoA: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '3', note: 'G003' }),
    f('sequencial', 'Nº sequencial do registro no lote', 9, 13, 'num', { note: 'G038' }),
    f('segmento', 'Código de segmento do registro detalhe', 14, 14, 'alfa', { constant: 'A', note: 'G039' }),
    f('tipoMovimento', 'Tipo de movimento', 15, 15, 'num', { note: 'G060' }),
    f('instrucaoMovimento', 'Código da instrução p/ movimento', 16, 17, 'num', { note: 'G061' }),
    f('camara', 'Código da câmara centralizadora', 18, 20, 'num', { note: 'P001' }),
    f('bancoFavorecido', 'Código do banco do favorecido', 21, 23, 'num', { note: 'P002' }),
    f('agencia', 'Agência mantenedora da conta do favorecido', 24, 28, 'num', { note: 'G008' }),
    f('agenciaDv', 'Dígito verificador da agência', 29, 29, 'alfa', { note: 'G009' }),
    f('conta', 'Número da conta corrente', 30, 41, 'num', { note: 'G010' }),
    f('contaDv', 'Dígito verificador da conta', 42, 42, 'alfa', { note: 'G011' }),
    f('agenciaContaDv', 'Dígito verificador da ag/conta', 43, 43, 'alfa', { note: 'G012' }),
    f('nomeFavorecido', 'Nome do favorecido', 44, 73, 'alfa', { note: 'G013' }),
    f('seuNumero', 'Nº do documento atribuído pela empresa (seu número)', 74, 93, 'alfa'),
    f('dataPagamento', 'Data do pagamento', 94, 101, 'num'),
    f('moeda', 'Tipo da moeda', 102, 104, 'alfa', { constant: 'BRL', note: 'G040' }),
    f('quantidadeMoeda', 'Quantidade da moeda', 105, 119, 'num', { decimals: 5, note: 'G041' }),
    f('valor', 'Valor do pagamento', 120, 134, 'num', { decimals: 2, note: 'P010' }),
    f('nossoNumero', 'Nº do documento atribuído pelo banco (nosso número)', 135, 154, 'alfa', { note: 'G043' }),
    f('dataReal', 'Data real da efetivação do pagamento', 155, 162, 'num'),
    f('valorReal', 'Valor real da efetivação do pagamento', 163, 177, 'num', { decimals: 2 }),
    f('outrasInformacoes', 'Outras informações', 178, 217, 'alfa', { note: 'G031' }),
    f('complementoServico', 'Código finalidade DOC / complemento tipo serviço', 218, 219, 'alfa', { note: 'P005' }),
    f('finalidadeTed', 'Código finalidade da TED', 220, 224, 'alfa', { note: 'P011' }),
    f('finalidadeComplementar', 'Complemento de finalidade do pagamento', 225, 226, 'alfa', { note: 'P013' }),
    blank('cnab1', 227, 229),
    f('aviso', 'Aviso ao favorecido', 230, 230, 'num', { note: 'P006' }),
    f('ocorrencias', 'Códigos das ocorrências p/ retorno', 231, 240, 'alfa', { note: 'G059' }),
  ],

  // Segmento B for credit in account and TED. In v11.0 positions 33-226 are three
  // "Informação" blocks (G101); outside Pix they keep the classic address and amounts layout below.
  segmentoB: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '3', note: 'G003' }),
    f('sequencial', 'Nº sequencial do registro no lote', 9, 13, 'num', { note: 'G038' }),
    f('segmento', 'Código de segmento do registro detalhe', 14, 14, 'alfa', { constant: 'B', note: 'G039' }),
    f('formaIniciacao', 'Forma de iniciação (só Pix)', 15, 17, 'alfa', { note: 'G100' }),
    f('tipoInscricao', 'Tipo de inscrição do favorecido', 18, 18, 'num', { note: 'G005' }),
    f('inscricao', 'Nº de inscrição do favorecido', 19, 32, 'alfa', { note: 'G006' }),
    f('logradouro', 'Logradouro', 33, 62, 'alfa', { note: 'G032' }),
    f('numero', 'Número do local', 63, 67, 'num', { note: 'G032' }),
    f('complemento', 'Complemento', 68, 82, 'alfa', { note: 'G032' }),
    f('bairro', 'Bairro', 83, 97, 'alfa', { note: 'G032' }),
    f('cidade', 'Cidade', 98, 117, 'alfa', { note: 'G033' }),
    f('cep', 'CEP', 118, 122, 'num', { note: 'G034' }),
    f('cepComplemento', 'Complemento do CEP', 123, 125, 'alfa', { note: 'G035' }),
    f('uf', 'Sigla do estado', 126, 127, 'alfa', { note: 'G036' }),
    f('vencimento', 'Data do vencimento (nominal)', 128, 135, 'num', { note: 'G044' }),
    f('valorDocumento', 'Valor do documento (nominal)', 136, 150, 'num', { decimals: 2, note: 'G042' }),
    f('abatimento', 'Valor do abatimento', 151, 165, 'num', { decimals: 2, note: 'G045' }),
    f('desconto', 'Valor do desconto', 166, 180, 'num', { decimals: 2, note: 'G046' }),
    f('mora', 'Valor da mora', 181, 195, 'num', { decimals: 2, note: 'G047' }),
    f('multa', 'Valor da multa', 196, 210, 'num', { decimals: 2, note: 'G048' }),
    f('codigoDocumentoFavorecido', 'Código/documento do favorecido', 211, 225, 'alfa'),
    f('aviso', 'Aviso ao favorecido', 226, 226, 'num', { note: 'P006' }),
    f('codigoUg', 'Código UG centralizadora (só SIAPE)', 227, 232, 'num', { note: 'P012' }),
    f('ispb', 'Código ISPB', 233, 240, 'num', { note: 'P015' }),
  ],

  trailerLote: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '5', note: 'G003' }),
    blank('cnab1', 9, 17),
    f('quantidadeRegistros', 'Quantidade de registros do lote', 18, 23, 'num', { note: 'G057' }),
    f('somaValores', 'Somatória dos valores', 24, 41, 'num', { decimals: 2, note: 'P007' }),
    f('somaQuantidadeMoedas', 'Somatória de quantidade de moedas', 42, 59, 'num', { decimals: 5, note: 'G058' }),
    f('avisoDebito', 'Número aviso de débito', 60, 65, 'num', { note: 'G066' }),
    blank('cnab2', 66, 230),
    f('ocorrencias', 'Códigos das ocorrências p/ retorno', 231, 240, 'alfa', { note: 'G059' }),
  ],

  trailerArquivo: [
    f('banco', 'Código do banco na compensação', 1, 3, 'num', { note: 'G001' }),
    f('lote', 'Lote de serviço', 4, 7, 'num', { constant: '9999', note: 'G002' }),
    f('registro', 'Tipo de registro', 8, 8, 'num', { constant: '9', note: 'G003' }),
    blank('cnab1', 9, 17),
    f('quantidadeLotes', 'Quantidade de lotes do arquivo', 18, 23, 'num', { note: 'G049' }),
    f('quantidadeRegistros', 'Quantidade de registros do arquivo', 24, 29, 'num', { note: 'G056' }),
    f('quantidadeContas', 'Qtde de contas p/ conciliação', 30, 35, 'num'),
    blank('cnab2', 36, 240),
  ],
}

export const LINE_LENGTH = 240

/** Defaults from the v11.0 manual. Banks on older manuals may ask for other versions. */
export const DEFAULT_VERSAO_ARQUIVO = '103'
export const DEFAULT_VERSAO_LOTE = '046'
export const MANUAL_VERSION = 'v11.0'
