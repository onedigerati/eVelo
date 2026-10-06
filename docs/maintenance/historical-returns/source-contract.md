# Reviewed annual-return source contract

## Phase 1 interface: identify, do not validate

Run from the repository with both paths explicitly selected:

```sh
npm run refresh:identify -- --source /path/to/reviewed.csv --manifest /path/to/reviewed.csv.manifest.json
```

For JSON, select `reviewed.json` and `reviewed.json.manifest.json` in the same
directory. Paths resolve from the caller's working directory; neither input is
discovered or inferred. Source extensions are case-sensitive `.csv` and `.json`.
The manifest filename is the entire source filename with `.manifest.json`
appended. Both the supplied paths and their resolved physical paths must form
this adjacent pair; symlinks cannot disguise an unrelated manifest.

The read-only command hashes the original source bytes with SHA-256. It reads
the manifest as a JSON object, requires `snapshotFilename` to match the selected
source basename and `snapshotSha256` to match the calculated lowercase digest,
and prints a JSON identity/provenance-only summary to stdout:

| Output field | Meaning |
|---|---|
| `notice`, `semanticValidation` | Explicit notice that semantic validation is not performed; claims are unvalidated |
| `sourceFormat`, `sourceFilename`, `sourceByteLength` | Selected format, basename and original byte length |
| `calculatedSnapshotSha256`, `declaredSnapshotSha256` | Exact-byte source digest and manifest-declared digest |
| `checksumMatches` | `true` only after identity comparison succeeds |
| `manifestProvenance` | The eight named provenance fields below, plus `exceptionCount` |
| `unreportedProvenanceFields` | Missing provenance fields or an absent/non-array `exceptions` claim |

Missing reported fields are explicitly listed and displayed as `null`;
`exceptionCount` is `null` when the manifest does not supply an array. The
command does not fill, validate or certify these claims. A missing or mismatched
identity field, missing/duplicate/unknown flag, unsupported source extension,
wrong pairing, unreadable file or unreadable manifest JSON produces a clear
stderr diagnostic, exit status 1 and no success summary. It accepts no apply,
fetch or candidate-generation flags.

**A matching digest is not semantic validation.** Phase 1 does not even parse
source CSV/JSON records. Identity success is not approval to use or apply data:
a malformed source can still be identified. Schema validation is exercised by
the separate contract tests, not by `refresh:identify`.

```sh
npm run test:refresh-identify
node --test test/maintenance/historical-returns/schema-contract.test.mjs
```

## Source records

[JSON source schema](schemas/annual-return-source.schema.json) and
[review manifest schema](schemas/annual-return-review-manifest.schema.json)
use JSON Schema draft 2020-12. JSON source and manifest records are closed:
unknown or missing fields are not accepted by their schema. These are contracts
for the future strict validator, not validation performed by the Phase 1 command.

CSV is UTF-8 with exactly the header `symbol,name,assetClass,year,return`, one
record per asset/calendar-year pair, standard CSV quoting for embedded commas
or quotes, and no comments or provenance embedded in data rows. Repeated
`symbol`, `name` and `assetClass` metadata for a symbol must agree.

| CSV field | Contract |
|---|---|
| `symbol` | Explicit, nonempty, nonblank symbol; no inferred aliases |
| `name` | Explicit, nonempty, nonblank display name |
| `assetClass` | `equity_index`, `equity_stock`, `bond` or `commodity`, matching preset data vocabulary |
| `year` | Integer calendar year, not a date or fractional/string year in JSON |
| `return` | Numeric decimal total return at least `-1` and at four-decimal precision, not a percent string |

The equivalent JSON shape is:

```json
{
  "assets": [
    {
      "symbol": "EXAMPLE",
      "name": "Example reviewed asset",
      "assetClass": "equity_stock",
      "returns": [
        { "year": 2025, "return": 0.0218 }
      ]
    }
  ]
}
```

| JSON field | Contract |
|---|---|
| `assets` | Required nonempty array of asset records |
| `assets[].symbol`, `.name`, `.assetClass` | Same explicit metadata as CSV |
| `assets[].returns` | Required nonempty array of annual records |
| `returns[].year` | Integer year from 1 through 9999; completed-year cutoff is a separate semantic check |
| `returns[].return` | Number at least `-1`, multiple of `0.0001`; the spelling is `year`, not preset `date` |

There must be one asset record per symbol and one annual record per symbol/year.
No missing years may be silently filled. Cross-record uniqueness, CSV metadata
consistency, finite values and actual coverage are Phase 2 semantic checks.
JSON numbers do not preserve trailing zeroes: `0.1` and `0.1000` represent the
same four-place-compatible decimal. `0.0218` means 2.18%, not 0.0218%.
No raw prices or price-to-return calculations belong in this input.

## Adjacent review manifest

All nine keys are required by the manifest contract. Provenance fields reject
common placeholder-only values and require minimum lengths appropriate to their
purpose. Source attribution, subset rationale, exception rationale, and
evidence require at least 12 characters; reviewer identifiers require at least
3 characters. These shape checks reject obvious placeholders but do not
establish that a source reference is durable, that evidence supports the claim,
or that the named reviewer is authorized.

| Field | Type and meaning |
|---|---|
| `sourceAttribution` | At least 12 characters identifying source owner/provider and durable snapshot reference; common placeholder-only values are rejected |
| `snapshotFilename` | Source basename ending in `.csv` or `.json`, with no directory path |
| `snapshotSha256` | Exactly 64 lowercase hexadecimal characters; SHA-256 over the original selected bytes |
| `methodology` | Closed object with the exact fields and values shown below |
| `coveredCalendarYears` | Nonempty unique array of integer years, 1 through 9999 |
| `assetScope` | Closed complete/subset object as described below |
| `reviewer` | At least 3 non-placeholder characters identifying the person approving the snapshot |
| `reviewDate` | Real calendar date `YYYY-MM-DD`; no timestamp or impossible date |
| `exceptions` | Array, including an explicit empty array when none apply; entries described below |
| `newSymbolPartitions` | Optional symbol-to-partition map; every genuinely new source symbol requires exactly one explicit `stocks.json` or `indices.json` destination |

The required methodology declaration is:

```json
{
  "returnConvention": "calendar-year total returns",
  "dividendsReinvested": true,
  "endpoints": "last-trading-day to last-trading-day",
  "units": "decimal",
  "decimalPlaces": 4,
  "etfReturnPolicy": "ETF-level returns"
}
```

The established convention (D-05) is annual total return with dividends
reinvested from the last trading day of the preceding year to the last trading
day of the reported year. Store decimal returns at four-decimal precision.
ETF presets use ETF-level returns rather than index total-return substitutes
(D-07); asset-specific approved conventions must be explained as exceptions.

The default policy is **complete bundled-set coverage**, explicitly declared
as `{"mode":"complete"}`. The schema's default annotation documents the policy;
no command or test synthesizes a missing `assetScope` or `mode`.
An intentionally limited review must explicitly declare a subset:

```json
{
  "mode": "subset",
  "symbols": ["EXAMPLE"],
  "rationale": "Only this symbol is covered by the explicitly reviewed correction."
}
```

Subset symbols must be nonempty, unique, nonblank strings; its scope rationale
must be nonblank. Subset scope must be visible in the review/report, not treated
as a complete refresh. Complete mode does not accept hidden subset fields.

When a source includes a symbol absent from both physical preset files, the
adjacent manifest must explicitly review its destination:

```json
{
  "newSymbolPartitions": {
    "EXAMPLE": "stocks.json"
  }
}
```

Only the literal filenames `stocks.json` and `indices.json` are accepted.
Routing is checked against both physical baseline partitions: a missing route,
a route for a symbol already present in either partition, or a route for a
symbol absent from the selected source blocks candidate generation. Existing
partition membership is retained (including QQQ in both files); `assetClass`
is never used to infer a destination.

Every exception is a closed object requiring `symbols` (nonempty unique symbol
array), `acceptedValueOrPolicy` (nonblank text stating the exact decimal value
or policy), `rationale` and `evidence` (nonblank text). Also supply `years`
(nonempty unique integer-year array) or `metadataField` (nonblank field name);
both may be supplied if both apply. Evidence must identify the relevant source
record or durable reference traceable to the selected reviewed snapshot.
The enclosing manifest records its reviewer and review date.

Example exception shape (illustrative, not a new data approval):

```json
{
  "symbols": ["EXAMPLE"],
  "years": [2025],
  "acceptedValueOrPolicy": "0.0218",
  "rationale": "Reviewer accepted the documented dividend adjustment.",
  "evidence": "reviewed.csv record EXAMPLE/2025 and accompanying review notes section 2"
}
```

SHA-256 binds exact bytes, including whitespace, line endings and encoding.
Compute it after preparing the final snapshot; any byte change requires a new
digest and review. It does not attest to source attribution, methodology,
reviewer authority or exception truth.

## Inherited exceptions and new-source provenance

The [verified exception ledger](verified-exception-ledger.md) preserves the
completed historical methodology, asset/year corrections, first-full-year
boundaries and metadata/file-retention decisions. It is review context, not a
substitute for recording exceptions applicable to a newly reviewed snapshot.
Under D-02 and D-06, each current manifest exception must independently identify
the affected symbols and years (or metadata field), state the accepted
value/policy, explain its rationale and cite evidence traceable to the selected
reviewed source. Record the approving reviewer and date in that snapshot's
manifest even when adopting an inherited decision.

Use the explicitly selected CSV/JSON snapshot plus its adjacent manifest for
every new review. The source-byte SHA-256 is specific to that snapshot, not to
this ledger, a normalized parse or the old verification outputs. The archive
does not establish a checksum for unavailable original provider snapshot bytes;
do not invent one. Its final applied decisions are evidenced by archived review
records, and earlier preliminary findings may differ from the final convention
decision. The ledger explains that precedence.

The archived `fetch_returns.mjs` and completed 45-asset verification are
historical evidence only, not maintained acquisition or review instructions.
Do not rerun them as part of this workflow. New review remains
maintainer-initiated when a selected, explicitly reviewed snapshot represents a
newly completed year or material source correction, with no unattended cadence.
Preserve complete-set coverage by default and explicitly declared subsets,
completed calendar years only, dry-run candidate ownership outside presets and
separate explicit apply in later phases. IndexedDB custom overrides remain
outside every stage's ownership boundary.

## Review policy and ownership boundaries

Only **completed calendar years** are baseline inputs: exclude the current
calendar year's partial return even if a provider labels it annual. Start at
the first full trading year, except for the established 1995 analysis window
for long-history assets. Reviewed exceptions must be explicit, not inferred
repairs. Do not silently normalize symbols, guess units or metadata, correct
values or fill gaps. Missing or ambiguous facts require corrected reviewed
inputs or a documented reviewer-approved exception.

A maintainer initiates review when an explicitly reviewed snapshot represents
a newly completed year or a material source correction. There is no unattended
cadence, provider retrieval or raw-price calculation in this workflow.

**Phase 2** owns strict schema and source-record checks, symbol/period rules,
finite-value/metadata/coverage validation, semantic sufficiency of provenance
claims, deterministic dry-run candidates and complete diffs. Dry run is the
future default; candidates belong outside
`src/data/presets`. **Phase 3** owns separate explicit apply of validated,
reviewed candidates to narrowly declared bundled preset files. Neither
capability is delivered by this Phase 1 identity command.

Bundled presets and browser-stored custom data have different ownership.
IndexedDB custom overrides, user imports and portfolio data remain untouched.
The repository maintenance workflow neither reads nor rewrites IndexedDB.
