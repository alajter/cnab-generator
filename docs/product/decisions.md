# Decisions

The choices behind v1, each with what was given up.

## D1. No server: everything runs in the browser

v0 was an Express server that received the spreadsheet. A payment spreadsheet holds names, CPF/CNPJ, bank accounts and amounts, the most sensitive data a small company has, and under the LGPD a server that receives it becomes a data processor with obligations.

v1 is a static site. Parsing, generation and validation run in the browser, and the same TypeScript core runs in the CLI.

*Given up:* server-side features such as saved payers shared across a team, or sending the file straight to a bank API. Neither was in scope.

## D2. Follow the FEBRABAN standard, not per-bank guesses

v0 shipped five "layouts", two hand-written CNAB files and three "FEBRABAN XML" formats for Bradesco, Santander and Caixa. Those XML formats are not a standard; they were invented. A developer who trusted them would have lost days.

v1 implements one thing correctly: FEBRABAN 240 v11.0, section 3.1.2. Banks that need different version numbers can set them, and the [compatibility table](../bank-compatibility.md) records what has been confirmed. Bank profiles will be added only from real acceptance reports.

*Given up:* a longer list of supported banks on day one. A short true list beats a long false one.

## D3. One layout definition drives generator, validator and docs

Field positions are written once, in `src/core/layout.ts`, copied from the manual. The generator writes with it, the validator reads with it, and `docs/layout.md` is generated from it. A test checks that each record covers positions 1 to 240 with no gap or overlap.

This makes a whole class of bugs impossible: a generator and a validator that disagree with each other.

## D4. Money is integer centavos, and ambiguity is an error

v0 stripped non-digits from `2500.75` and then multiplied by 100, paying R$ 250.075,00 instead of R$ 2.500,75. Any code path that sees money as a float or as a string of digits has this risk.

v1 parses amounts into integer centavos once, at the edge, and never converts back until the file is written. `1.234` is refused: in a Brazilian sheet it means a thousand reais, in an English one it means one real and change. The user is asked to write `1.234,00` or `1,23`.

*Given up:* a few sheets that worked before now need a fix. That friction is the point.

## D5. Separate lotes by forma de lançamento, automatically

Within a lote, every payment must use the same forma. Credit in account (01) only works for accounts at the payer's own bank; anything else is a TED (41, or 43 between accounts of the same owner). v0 put everything in one lote as forma 01.

v1 decides the forma per payment from the payee's bank and document, and writes one lote per forma. The user never has to know the rule; the validator explains it when someone else's file breaks it.

## D6. Errors over guesses; warnings for what the bank might accept

Two severities. **Erro** blocks generation and fails the CLI: the bank will reject it, or it would pay the wrong amount. **Aviso** is shown but does not block: weekends, past dates, missing TED purpose code, a missing account check digit. Banks differ on these, and blocking would stop valid payments.

## D7. Support the alphanumeric CNPJ now

The Receita Federal issues alphanumeric CNPJs from July 2026, and FEBRABAN v11.0 changed the inscription fields from numeric to alphanumeric to carry them. Supporting it cost one function (character value = ASCII code minus 48, same weights). Not supporting it would have rejected real companies.

## D8. Portuguese app, English README

The users are Brazilian and the domain vocabulary (remessa, lote, convênio, favorecido) has no good translation, so the app and its messages are in Portuguese. The README and product docs are in English so that contributors and reviewers outside Brazil can follow the reasoning; there is a Portuguese README and user guide too.
