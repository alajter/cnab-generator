# Roadmap

Ordered by what moves the outcome (files accepted by the bank on the first try), not by size.

## Now: prove it at the banks

- Collect acceptance reports through the [issue form](https://github.com/alajter/cnab-generator/issues/new?template=bank-result.yml) and record them in the [compatibility table](../bank-compatibility.md).
- Turn each rejection into a validator rule or a bank note, with a test file.

Exit: confirmed acceptance at five banks, including at least two of Itaú, Banco do Brasil, Bradesco, Caixa and Santander.

## Next

| Item | Why | Size |
|---|---|---|
| Bank profiles (versions, fillers, required TED purpose), only from reports | Removes the most common "standard but rejected" cases | S per bank |
| Read return files (*retorno*): show which payments were paid or rejected, with the reason code | Closes the loop the remessa opens | M |
| Pix (formas 45 and 47), with the Pix version of segment B | Many companies now pay suppliers by Pix instead of TED | M |
| Publish the core on npm | Developers can depend on it instead of copying it | S |

## Later

- Boletos (segment J and J-52), including Pix QR codes.
- Taxes and utility bills with barcode (segment O).
- Itaú SISPAG and other proprietary 240 variants, if reports show demand.

## Not planned

- A hosted backend or accounts. See [decision D1](decisions.md#d1-no-server-everything-runs-in-the-browser).
- CNAB 400. It is the older format and mostly used for collections (*cobrança*), not payments.
- Sending files to banks. That needs a contract with each bank and belongs to the company's own systems.
