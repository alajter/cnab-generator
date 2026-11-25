# Layout reference

Generated from `src/core/layout.ts` by `npm run docs:layout`. Do not edit by hand.

FEBRABAN CNAB 240 v11.0, section 3.1.2 (payments by credit in account and TED). File layout version `103`, lote layout version `046`.
Positions are 1-based and inclusive. `num` fields are right-aligned and zero-filled; `alfa` fields are left-aligned and space-filled. Note codes (G001, P010...) point to the field descriptions in the FEBRABAN manual.

## Header de arquivo

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço | `0000` | G002 |
| 8-8 | 1 | num | Tipo de registro | `0` | G003 |
| 9-17 | 9 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 18-18 | 1 | num | Tipo de inscrição da empresa |  | G005 |
| 19-32 | 14 | alfa | Número de inscrição da empresa |  | G006 |
| 33-52 | 20 | alfa | Código do convênio no banco |  | G007 |
| 53-57 | 5 | num | Agência mantenedora da conta |  | G008 |
| 58-58 | 1 | alfa | Dígito verificador da agência |  | G009 |
| 59-70 | 12 | num | Número da conta corrente |  | G010 |
| 71-71 | 1 | alfa | Dígito verificador da conta |  | G011 |
| 72-72 | 1 | alfa | Dígito verificador da ag/conta |  | G012 |
| 73-102 | 30 | alfa | Nome da empresa |  | G013 |
| 103-132 | 30 | alfa | Nome do banco |  | G014 |
| 133-142 | 10 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 143-143 | 1 | num | Código remessa/retorno |  | G015 |
| 144-151 | 8 | num | Data de geração do arquivo |  | G016 |
| 152-157 | 6 | num | Hora de geração do arquivo |  | G017 |
| 158-163 | 6 | num | Número sequencial do arquivo |  | G018 |
| 164-166 | 3 | num | Nº da versão do layout do arquivo |  | G019 |
| 167-171 | 5 | num | Densidade de gravação do arquivo |  | G020 |
| 172-191 | 20 | alfa | Para uso reservado do banco |  | G021 |
| 192-211 | 20 | alfa | Para uso reservado da empresa |  | G022 |
| 212-240 | 29 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |

## Header de lote

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço |  | G002 |
| 8-8 | 1 | num | Tipo de registro | `1` | G003 |
| 9-9 | 1 | alfa | Tipo da operação | `C` | G028 |
| 10-11 | 2 | num | Tipo do serviço |  | G025 |
| 12-13 | 2 | num | Forma de lançamento |  | G029 |
| 14-16 | 3 | num | Nº da versão do layout do lote |  | G030 |
| 17-17 | 1 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 18-18 | 1 | num | Tipo de inscrição da empresa |  | G005 |
| 19-32 | 14 | alfa | Número de inscrição da empresa |  | G006 |
| 33-52 | 20 | alfa | Código do convênio no banco |  | G007 |
| 53-57 | 5 | num | Agência mantenedora da conta |  | G008 |
| 58-58 | 1 | alfa | Dígito verificador da agência |  | G009 |
| 59-70 | 12 | num | Número da conta corrente |  | G010 |
| 71-71 | 1 | alfa | Dígito verificador da conta |  | G011 |
| 72-72 | 1 | alfa | Dígito verificador da ag/conta |  | G012 |
| 73-102 | 30 | alfa | Nome da empresa |  | G013 |
| 103-142 | 40 | alfa | Mensagem |  | G031 |
| 143-172 | 30 | alfa | Logradouro |  | G032 |
| 173-177 | 5 | num | Número do local |  | G032 |
| 178-192 | 15 | alfa | Complemento |  | G032 |
| 193-212 | 20 | alfa | Cidade |  | G033 |
| 213-217 | 5 | num | CEP |  | G034 |
| 218-220 | 3 | alfa | Complemento do CEP |  | G035 |
| 221-222 | 2 | alfa | Sigla do estado |  | G036 |
| 223-224 | 2 | num | Indicativo da forma de pagamento do serviço |  | P014 |
| 225-230 | 6 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 231-240 | 10 | alfa | Códigos das ocorrências p/ retorno |  | G059 |

## Detalhe, segmento A

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço |  | G002 |
| 8-8 | 1 | num | Tipo de registro | `3` | G003 |
| 9-13 | 5 | num | Nº sequencial do registro no lote |  | G038 |
| 14-14 | 1 | alfa | Código de segmento do registro detalhe | `A` | G039 |
| 15-15 | 1 | num | Tipo de movimento |  | G060 |
| 16-17 | 2 | num | Código da instrução p/ movimento |  | G061 |
| 18-20 | 3 | num | Código da câmara centralizadora |  | P001 |
| 21-23 | 3 | num | Código do banco do favorecido |  | P002 |
| 24-28 | 5 | num | Agência mantenedora da conta do favorecido |  | G008 |
| 29-29 | 1 | alfa | Dígito verificador da agência |  | G009 |
| 30-41 | 12 | num | Número da conta corrente |  | G010 |
| 42-42 | 1 | alfa | Dígito verificador da conta |  | G011 |
| 43-43 | 1 | alfa | Dígito verificador da ag/conta |  | G012 |
| 44-73 | 30 | alfa | Nome do favorecido |  | G013 |
| 74-93 | 20 | alfa | Nº do documento atribuído pela empresa (seu número) |  |  |
| 94-101 | 8 | num | Data do pagamento |  |  |
| 102-104 | 3 | alfa | Tipo da moeda | `BRL` | G040 |
| 105-119 | 15 | num (10,5) | Quantidade da moeda |  | G041 |
| 120-134 | 15 | num (13,2) | Valor do pagamento |  | P010 |
| 135-154 | 20 | alfa | Nº do documento atribuído pelo banco (nosso número) |  | G043 |
| 155-162 | 8 | num | Data real da efetivação do pagamento |  |  |
| 163-177 | 15 | num (13,2) | Valor real da efetivação do pagamento |  |  |
| 178-217 | 40 | alfa | Outras informações |  | G031 |
| 218-219 | 2 | alfa | Código finalidade DOC / complemento tipo serviço |  | P005 |
| 220-224 | 5 | alfa | Código finalidade da TED |  | P011 |
| 225-226 | 2 | alfa | Complemento de finalidade do pagamento |  | P013 |
| 227-229 | 3 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 230-230 | 1 | num | Aviso ao favorecido |  | P006 |
| 231-240 | 10 | alfa | Códigos das ocorrências p/ retorno |  | G059 |

## Detalhe, segmento B

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço |  | G002 |
| 8-8 | 1 | num | Tipo de registro | `3` | G003 |
| 9-13 | 5 | num | Nº sequencial do registro no lote |  | G038 |
| 14-14 | 1 | alfa | Código de segmento do registro detalhe | `B` | G039 |
| 15-17 | 3 | alfa | Forma de iniciação (só Pix) |  | G100 |
| 18-18 | 1 | num | Tipo de inscrição do favorecido |  | G005 |
| 19-32 | 14 | alfa | Nº de inscrição do favorecido |  | G006 |
| 33-62 | 30 | alfa | Logradouro |  | G032 |
| 63-67 | 5 | num | Número do local |  | G032 |
| 68-82 | 15 | alfa | Complemento |  | G032 |
| 83-97 | 15 | alfa | Bairro |  | G032 |
| 98-117 | 20 | alfa | Cidade |  | G033 |
| 118-122 | 5 | num | CEP |  | G034 |
| 123-125 | 3 | alfa | Complemento do CEP |  | G035 |
| 126-127 | 2 | alfa | Sigla do estado |  | G036 |
| 128-135 | 8 | num | Data do vencimento (nominal) |  | G044 |
| 136-150 | 15 | num (13,2) | Valor do documento (nominal) |  | G042 |
| 151-165 | 15 | num (13,2) | Valor do abatimento |  | G045 |
| 166-180 | 15 | num (13,2) | Valor do desconto |  | G046 |
| 181-195 | 15 | num (13,2) | Valor da mora |  | G047 |
| 196-210 | 15 | num (13,2) | Valor da multa |  | G048 |
| 211-225 | 15 | alfa | Código/documento do favorecido |  |  |
| 226-226 | 1 | num | Aviso ao favorecido |  | P006 |
| 227-232 | 6 | num | Código UG centralizadora (só SIAPE) |  | P012 |
| 233-240 | 8 | num | Código ISPB |  | P015 |

## Trailer de lote

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço |  | G002 |
| 8-8 | 1 | num | Tipo de registro | `5` | G003 |
| 9-17 | 9 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 18-23 | 6 | num | Quantidade de registros do lote |  | G057 |
| 24-41 | 18 | num (16,2) | Somatória dos valores |  | P007 |
| 42-59 | 18 | num (13,5) | Somatória de quantidade de moedas |  | G058 |
| 60-65 | 6 | num | Número aviso de débito |  | G066 |
| 66-230 | 165 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 231-240 | 10 | alfa | Códigos das ocorrências p/ retorno |  | G059 |

## Trailer de arquivo

| Positions | Size | Type | Field | Fixed value | Note |
|---|---|---|---|---|---|
| 1-3 | 3 | num | Código do banco na compensação |  | G001 |
| 4-7 | 4 | num | Lote de serviço | `9999` | G002 |
| 8-8 | 1 | num | Tipo de registro | `9` | G003 |
| 9-17 | 9 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |
| 18-23 | 6 | num | Quantidade de lotes do arquivo |  | G049 |
| 24-29 | 6 | num | Quantidade de registros do arquivo |  | G056 |
| 30-35 | 6 | num | Qtde de contas p/ conciliação |  |  |
| 36-240 | 205 | alfa | Uso exclusivo FEBRABAN/CNAB |  | G004 |

