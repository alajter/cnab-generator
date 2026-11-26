# Contributing

## The most useful things to send

1. **A bank result.** You sent a file generated or checked here: was it accepted? Use the [bank result form](https://github.com/alajter/cnab-generator/issues/new?template=bank-result.yml). Rejections with their code are the most valuable.
2. **A file the validator gets wrong.** It flags something your bank accepts, or misses something your bank rejects. Attach the file **with fake data** (replace names, documents and accounts).
3. **A spreadsheet the generator reads wrong.** Same rule: fake data only.

Never attach real payment files. They contain personal data protected by the LGPD.

## Development

```sh
npm ci
npm run dev        # web app on http://localhost:5173
npm test           # vitest
npm run build      # typecheck, web build, CLI build
npm run docs:layout  # regenerate docs/layout.md after changing src/core/layout.ts
```

Rules for changes:

- Field positions live only in `src/core/layout.ts`, with the FEBRABAN note code. Cite the manual version and section in the pull request.
- Every new validator rule comes with a test file that breaks it.
- Money stays in integer centavos. Nothing that parses or formats amounts may use floating point.
- User-facing messages are in Portuguese and say what to do, not only what is wrong.
