# Bank compatibility

What has been confirmed with real files at each bank. A file can follow the FEBRABAN manual exactly and still be rejected by a bank that applies its own rules, so this table only lists results someone actually reported.

**Nothing has been confirmed yet.** If you send a remessa generated or checked here, please [report the result](https://github.com/alajter/cnab-generator/issues/new?template=bank-result.yml), accepted or rejected. A rejection with its code is just as useful.

| Bank | Code | Status | Notes |
|---|---|---|---|
| Banco do Brasil | 001 | Not tested | |
| Santander | 033 | Not tested | |
| Banrisul | 041 | Not tested | Publishes its own adaptation of the FEBRABAN layout ("BanriPag"). |
| Banco Inter | 077 | Not tested | |
| Caixa | 104 | Not tested | |
| BTG Pactual | 208 | Not tested | |
| Bradesco | 237 | Not tested | |
| Itaú | 341 | Not tested | Itaú's SISPAG is a proprietary 240 variant with differences in segment A. This tool writes the FEBRABAN standard. |
| Safra | 422 | Not tested | |
| Sicredi | 748 | Not tested | |
| Sicoob | 756 | Not tested | |

## Settings banks commonly differ on

- **Layout versions** (file positions 164-166, lote positions 14-16). Default `103` and `046` per v11.0. Older bank manuals ask for `089`/`045` or others. The library takes `versaoArquivo` and `versaoLote` options.
- **TED purpose code** (segment A, positions 220-224). Many banks require it. Set it per payment (`finalidade_ted` column) or as the payer default.
- **Convênio format** (positions 33-52). Each bank defines what goes there; copy it exactly as the bank gave it.
- **Account check digit**. Some banks use a combined agency/account digit (position 72 or 43) instead.
