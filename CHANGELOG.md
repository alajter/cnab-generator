# Changelog

## 1.0.0 (2026-11-25)

Rebuilt from scratch. See [the retrospective](docs/product/retrospective.md) for why.

- FEBRABAN 240 v11.0, payments by credit in account (forma 01) and TED (formas 41 and 43), segments A and B.
- Validator for any CNAB 240 payment file, with line, field and position for every problem.
- Runs in the browser; no server. CLI (`cnab gerar`, `cnab validar`) and TypeScript library.
- Amounts as integer centavos; ambiguous amounts are errors. Time-zone-safe dates.
- Automatic lotes by forma de lançamento.
- CPF and CNPJ check digits, including the alphanumeric CNPJ.
- Removed: the Express server and the "FEBRABAN XML" layouts, which were not a real standard.

## 0.1.0 (2025-11-20)

First MVP: Express API and React form. Not safe to use; see the retrospective.
