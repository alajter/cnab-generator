# Documentation

| Document | For | Language |
|---|---|---|
| [Guia da planilha](guia.md) | Users: spreadsheet columns, how lotes are built, common validator errors | Português |
| [Layout reference](layout.md) | Developers: every field of every record, generated from the code | English, field names in Portuguese |
| [Bank compatibility](bank-compatibility.md) | Everyone: what has been confirmed at each bank | English |
| [PRD](product/prd.md) | Product: users, problem, scope, requirements, success measures | English |
| [Decisions](product/decisions.md) | Product and engineering: the choices behind v1 and their trade-offs | English |
| [Retrospective](product/retrospective.md) | Product: what v0 got wrong and why | English |
| [Roadmap](product/roadmap.md) | Everyone: now, next, later, not planned | English |

## Code map

```
src/core/layout.ts     the FEBRABAN v11.0 field table (single source of truth)
src/core/input.ts      spreadsheet rows to validated payments
src/core/generate.ts   payments to remessa: lotes, segments A and B, trailers
src/core/validate.ts   any remessa to a report of issues, by line and field
src/core/money.ts      amounts as integer centavos
src/core/dates.ts      calendar dates without time zones
src/core/documents.ts  CPF and CNPJ (including alphanumeric) check digits
src/cli.ts             `cnab gerar` and `cnab validar`
web/                   the static web app
test/                  vitest suite
```
