# PRD: cnab-generator v1

Status: shipped (v1.0, November 2026) · Owner: André Lajter

## Problem

A Brazilian company that pays suppliers or salaries in bulk sends its bank a CNAB 240 *remessa*: a fixed-width text file whose every field sits at a position set by FEBRABAN. Banks reject a file for one wrong character, and the rejection usually arrives as a code a day later.

The people who build these files are generalist developers or finance staff with a spreadsheet. They work from old blog posts or a previous employee's script. The failures are silent until the bank answers: amounts scaled wrong, dates shifted by the time zone, an interbank transfer in a same-bank batch, an accent in a name.

The first version of this project (v0, November 2025) had most of these bugs. See the [retrospective](retrospective.md).

## Users

| Who | Situation | What they need |
|---|---|---|
| **Developer integrating payments** (primary) | Building or fixing the code that writes the remessa. Has the bank manual open in another tab. | A file they can trust as a reference, and a validator that says *which field, which position* when the bank rejects theirs. |
| **Finance analyst at a small company** | Pays 5 to 200 people a week from a spreadsheet; the bank's portal accepts a file upload. | Turn the spreadsheet into a file without installing anything or sending payroll data to a stranger's server. |

Not targeted in v1: banks themselves, large ERPs with certified CNAB modules, payment processors.

## Jobs to be done

1. *When the bank rejects my file, I want to see exactly which field is wrong, so I can fix my code today instead of opening a ticket.*
2. *When I pay suppliers from a spreadsheet, I want a correct file in minutes, without my data leaving my computer.*
3. *When I write my own generator, I want a correct file to compare against, field by field.*

## Scope (v1)

In:
- FEBRABAN 240 v11.0, section 3.1.2: payment by credit in account (forma 01) and TED (formas 41 and 43), segments A and B.
- Generation from CSV (`,` `;` or tab, with or without BOM) and Excel.
- Validation of any CNAB 240 payment file: structure, line length, line endings, encoding, sequences, counts, totals, CPF/CNPJ, dates, numeric fields, câmara and forma consistency.
- Web app (static, GitHub Pages), CLI, TypeScript library.
- Alphanumeric CNPJ.

Out (see [roadmap](roadmap.md)): Pix, boletos (segment J), taxes (N, O), DOC (discontinued by the banks in 2024), return files, bank-specific variants such as Itaú's SISPAG.

## Requirements

| # | Requirement | How it is met |
|---|---|---|
| R1 | Every generated file passes the validator with zero errors. | Property test with 500 random payments. |
| R2 | No silent changes to money. Ambiguous or over-precise amounts are errors. | `parseAmount` returns an error, never a guess; integer centavos. |
| R3 | Every user-facing problem names the row and column (spreadsheet) or line, field and positions (file). | `RowIssue`, `FileIssue` types; UI and CLI print them. |
| R4 | Payment data never leaves the device. | Static site, no backend, no analytics. |
| R5 | Field positions live in one place. | `src/core/layout.ts`; the docs reference is generated from it. |
| R6 | A first-time visitor sees a full generate → validate flow in under a minute. | "Usar dados de exemplo" fills payer and sheet. |
| R7 | Works on a phone-width screen. | Responsive layout; tables scroll horizontally. |

## Success

The real outcome is a file **accepted by the bank on the first try**. The tool cannot observe that (by design, R4), so v1 measures what it can and asks for the rest:

| Signal | Source | Target for the first 90 days |
|---|---|---|
| Bank acceptance reports | GitHub issue form "Resultado no banco" | Reports from at least 5 different banks; acceptance on first try in 80% |
| Validator catching real bugs | Issues and discussions where someone found the cause of a rejection | 10 |
| Adoption by developers | GitHub stars, forks, npm installs once published | 100 stars |
| Correctness regressions | Bug reports about generated files | 0 open for more than a week |

No telemetry is collected. If usage numbers matter more later, the option is privacy-preserving page counts on the static site, never payment data.

## Risks

| Risk | Mitigation |
|---|---|
| Banks deviate from the FEBRABAN standard (field fillers, version numbers, finalidade codes). | Versions configurable; compatibility table per bank; issue form for results. Bank profiles are on the roadmap, but only from real reports, never guessed. |
| Someone trusts the tool as a certification. | README, app and footer say it is an aid; the manual and the bank decide. |
| The FEBRABAN manual changes again. | Layout in one file with a tiling test; manual version shown in the app and docs. |
