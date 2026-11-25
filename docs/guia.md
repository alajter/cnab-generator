# Guia da planilha

Como montar a planilha de pagamentos e o que fazer com cada erro.

## Colunas

A primeira linha é o cabeçalho. A ordem não importa e maiúsculas, acentos e espaços nos nomes são ignorados (`Data Pagamento` vale como `data_pagamento`).

| Coluna | Obrigatória | Exemplo | Também aceita |
|---|---|---|---|
| `nome` | sim | Maria Souza ME | favorecido, beneficiario |
| `cpf_cnpj` | sim | 529.982.247-25 ou 12.ABC.345/01DE-35 | cpf, cnpj, documento |
| `banco` | sim | 341 | codigo_banco |
| `agencia` | sim | 0001 ou 0001-9 | ag |
| `agencia_dv` | não | 9 | dv_agencia |
| `conta` | sim | 12345 ou 12345-6 | conta_corrente, cc |
| `conta_dv` | não | 6 | dv_conta, dv |
| `valor` | sim | 2.500,75 | valor_pagamento |
| `data_pagamento` | sim | 27/11/2026 | data |
| `seu_numero` | não | NF 1021 | referencia, identificador |
| `finalidade_ted` | não | 00005 | finalidade |
| `ispb` | não | 18236120 | codigo_ispb |

Baixe o modelo no app (botão *Baixar modelo*). No Excel em português, salve como CSV com ponto e vírgula; o gerador detecta o separador.

### Valores

Aceitos: `2.500,75` · `2500,75` · `2500.75` · `2,500.75` · `R$ 2.500,75` · `2500`.

Recusado: `1.234` e `1,234`. Pode ser mil e duzentos reais ou um real e vinte e três centavos, dependendo de quem digitou. Escreva com os centavos: `1.234,00`.

### Datas

`27/11/2026`, `27-11-2026`, `2026-11-27` ou a data do próprio Excel. Datas no passado e em fins de semana geram aviso: o banco pode rejeitar ou pagar no próximo dia útil.

### Agência e conta

Se a coluna de DV estiver vazia e a conta vier como `12345-6`, o gerador separa o dígito. Conta sem dígito gera aviso, porque a maioria dos bancos exige.

## Como o arquivo é montado

- Pagamentos para contas **do mesmo banco do pagador** vão num lote de crédito em conta (forma 01).
- Pagamentos para **outros bancos** vão num lote de TED (forma 41). Se o CPF/CNPJ do favorecido for o da própria empresa, forma 43.
- Se a linha tiver `ispb`, a TED usa a câmara 988 e o código ISPB vai no segmento B.

## Erros comuns no validador

| Mensagem | O que fazer |
|---|---|
| A linha tem N posições; o CNAB 240 exige exatamente 240 | Algum campo de texto não foi preenchido com espaços até o fim, ou um campo passou do tamanho. Veja a linha no visualizador. |
| As linhas terminam só com LF | Salve com CRLF (`\r\n`). No Linux/macOS o padrão é LF. |
| Campo numérico com "   " | Campos numéricos levam zeros à esquerda, nunca espaços, mesmo quando não se aplicam. |
| Somatória R$ X; a soma dos segmentos A dá R$ Y | O trailer do lote não bate com os pagamentos. Some de novo os valores do lote, em centavos. |
| Sequencial N; esperado M | A numeração (posições 9-13) conta todos os segmentos do lote, A e B, a partir de 00001. |
| Lote de crédito em conta (forma 01) com favorecido do banco X | Crédito em conta só vale para o próprio banco. Mova o pagamento para um lote de TED. |
| Segmento A sem o segmento B | Neste tipo de pagamento cada segmento A precisa de um B logo depois, com o CPF/CNPJ do favorecido. |
| Caracteres fora do ASCII | Remova acentos e ç dos nomes. |
