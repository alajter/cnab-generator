/**
 * The banks most companies send payment files to, with their COMPE codes. The generator accepts
 * any 3-digit code; this list only fills "Nome do banco" in the file header and the UI picker.
 */
export const BANKS: Record<string, string> = {
  '001': 'BANCO DO BRASIL',
  '033': 'BANCO SANTANDER',
  '041': 'BANRISUL',
  '077': 'BANCO INTER',
  '104': 'CAIXA ECONOMICA FEDERAL',
  '208': 'BANCO BTG PACTUAL',
  '237': 'BANCO BRADESCO',
  '260': 'NU PAGAMENTOS',
  '336': 'BANCO C6',
  '341': 'BANCO ITAU',
  '422': 'BANCO SAFRA',
  '748': 'SICREDI',
  '756': 'SICOOB',
}

export function bankName(code: string): string {
  return BANKS[code] ?? `BANCO ${code}`
}
