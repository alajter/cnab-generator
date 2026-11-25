# Retrospective: v0 to v1

## v0 (November 2025)

Two commits in one day: an Express API, a React upload form and five layout files. The plan was a one-week MVP for Itaú and Banco do Brasil. It "worked": it produced a text file with 240-character lines.

## What v1's validator says about v0's output

The repository still had a file v0 generated (`output.txt`, two payments). Running v1's validator on it:

```
$ cnab validar output.txt
28 erro(s), 4 aviso(s)
```

The ones that matter:

| Problem in v0's file | Consequence at the bank |
|---|---|
| `2500.75` written as `25007500` centavos: R$ 250.075,00 | Pays a hundred times the amount, if the bank's limits don't stop it first |
| Every payment date `01011970` | The spreadsheet library returned dates as Excel serial numbers, and v0 read them as milliseconds since 1970. Rejected. |
| Batch total R$ 390.075,00 against details summing R$ 251.475,00 | Rejected: trailer does not match |
| Payer agency, account and convênio empty | Rejected: the bank cannot tell which account to debit |
| No segment B | Rejected: segment B is required for these payments and carries the payee's CPF/CNPJ |
| LF line endings | Rejected by several banks |
| Layout version `040` | Rejected by banks that require a newer version |
| Example CNPJ with invalid check digits | Accepted by v0 without a warning |

v0 also offered "FEBRABAN XML" for three banks. That format does not exist.

## Why it happened

- **No validator.** The only check was "every line is 240 characters". A format this strict needs an independent check, and in v0 nothing read the file back.
- **Layouts typed by hand per bank,** with gaps (positions 33-72 missing in the header) and no test that each record was complete.
- **Money as strings of digits.** One regex removed the decimal point before a multiplication that assumed it was still there.
- **Scope set by bank count** ("five banks") rather than by correctness for one.
- **The PRD listed deliverables, not outcomes.** "CNAB 240 generation working for both banks" was ticked when a file came out, not when a bank accepted one.

## What v1 changed

Each cause has a counterpart in the [decisions](decisions.md): the validator first and the generator tested against it (D3), one layout taken from the manual with a tiling test, integer centavos with ambiguity as an error (D4), one standard done properly instead of five guesses (D2), and success defined as bank acceptance, measured by asking (see the [PRD](prd.md)).

## What I would do differently again

Ship the validator alone first. It is useful on its own to anyone whose file was rejected, it needs no payer data, and every bug report against it would have improved the generator before the generator existed.
