# Verified historical methodology and exception ledger

This ledger transcribes the completed 45-asset verification and applied
decisions recorded on 2026-07-07. It preserves D-05 (methodology), D-06
(inherited decisions without repeating verification) and D-07 (ETF-level
returns). The [sanitized historical evidence record](historical-evidence.md)
preserves the cited source references and rationale without importing the raw
working archive.
It does not recalculate returns, newly verify any asset, or approve a future
snapshot. See the [source contract](source-contract.md) for new-source review.

## Decision inventory

Coverage boundaries exclude partial IPO/inception years; they are not data
corrections. Value rows are corrections or methodology exceptions as explained
below; display naming is a metadata decision. Policy rows distinguish the
analysis window, methodology, storage convention and historical file ownership.
Each row includes a self-contained rationale and links to its evidence category
in the sanitized historical evidence record.

| ID | Subject | Year/field | Accepted value/policy | Rationale | Repository record |
|---|---|---|---|---|---|
| start-AMZN | AMZN | startYear | 1998 | First full calendar year after the 1997 IPO; exclude the partial listing year. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-GOOGL | GOOGL | startYear | 2005 | First full calendar year after the 2004 IPO; do not retain fabricated pre-IPO history. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-TSLA | TSLA | startYear | 2011 | First full calendar year after the 2010 IPO; exclude partial and pre-IPO periods. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-META | META | startYear | 2013 | First full calendar year after the 2012 IPO; exclude partial and pre-IPO periods. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-RIVN | RIVN | startYear | 2022 | First full calendar year after the 2021 IPO; short real coverage must not be padded. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-AVGO | AVGO | startYear | 2010 | First full calendar year after Avago's 2009 IPO; exclude its partial inception year. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-NVDA | NVDA | startYear | 2000 | First full calendar year after the 1999 IPO; exclude partial and pre-IPO periods. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-GLD | GLD | startYear | 2005 | First full calendar year after fund inception on 2004-11-18; exclude partial 2004. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-CME | CME | startYear | 2003 | First full calendar year after the 2002 IPO; exclude partial and pre-IPO periods. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-UPS | UPS | startYear | 2000 | First full calendar year after the 1999 IPO; exclude the partial listing year. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-VTI | VTI | startYear | 2002 | First full calendar year after 2001 ETF inception; do not substitute older index history. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-QQQ | QQQ | startYear | 2000 | First full calendar year after 1999 ETF inception; exclude the partial inception year. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-IWM | IWM | startYear | 2001 | First full calendar year after 2000 ETF inception; exclude partial fund history. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-AGG | AGG | startYear | 2004 | First full calendar year after 2003-09-22 fund inception; exclude partial 2003. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| start-DELL | DELL | startYear | 2019 | DVMT tracking-stock years 2017-2018 are not DELL Class C; 2019 is its first full calendar year. | [Boundary evidence](historical-evidence.md#full-calendar-year-coverage-boundaries) |
| value-AVGO-2018 | AVGO | 2018 | 0.0218 | Correct Yahoo dividend-data artifact; two total-return sources and archived dividend arithmetic agree on 2.18%. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| value-ETN-2001 | ETN | 2001 | 0.1681 | Correct mis-valued Axcelis spin-off adjustment; Eaton's proxy TSR table supports 16.81%, not the inflated computed return. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| value-ETN-2018 | ETN | 2018 | -0.1004 | Correct dividend adjustment; Macrotrends dividend-adjusted return and archived independent arithmetic support -10.04%. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| value-AGG-2008 | AGG | 2008 | 0.0588 | Use NAV total return to avoid treating the crisis ETF premium dislocation as repeatable independently sampled annual volatility. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| value-AGG-2009 | AGG | 2009 | 0.0514 | Use NAV total return rather than the market-price reversal of the 2008 premium dislocation in independently sampled annual returns. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| name-GLD | GLD | name | Gold (GLD) | Preserve the approved display name identifying gold exposure through GLD rather than a generic stock label. | [Value evidence](historical-evidence.md#applied-return-and-metadata-decisions) |
| policy-window | long-history assets | analysis window | 1995 | Intentional analysis-window start aligns assets for the correlation matrix; it is not their first trading year. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-etf | ETF presets | return series | ETF-level returns | Preserve investable ETF-level returns rather than index total-return series with different economics and inception coverage. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-methodology | all assets | methodology | calendar-year total returns | Dividends reinvested preserve total-return economics; price-only discrepancies do not alone justify corrections. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-endpoints | all assets | endpoints | last-trading-day to last-trading-day | Annual calendar-year return uses preceding year-end through reported year-end, not a first-trading-day starting window. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-units | all assets | units/precision | decimal; four-decimal precision | Store decimal returns at four-decimal precision; percentage notation in archived explanations is not the stored unit. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-sp500 | sp500.json | file retention | retain refreshed file | Retain the refreshed but unimported file pending explicit deletion approval and maintainer sign-off. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |
| policy-QQQ | QQQ | indices.json duplicate | retain synchronized duplicate | Retain the historical duplicate entry in indices.json and keep it synchronized, rather than silently changing file ownership. | [Methodology evidence](historical-evidence.md#methodology-and-file-governance) |

## Archived explanations and precedence

**Data correction: AVGO 2018.** The archived run 1 verification records a
computed 3.62% versus two total-return sources' 2.18%. Its dividend arithmetic
could reproduce the latter, not the former, and identifies the Yahoo
dividend-data artifact. The accepted decimal `0.0218` is in
the [sanitized evidence record](historical-evidence.md#applied-return-and-metadata-decisions).
This is a transcription of the already approved adjustment, not new
arithmetic or a new source check.

**Data corrections: ETN 2001 and 2018.** Run 2 records Eaton's own proxy
dividends-reinvested TSR table supporting 16.81% for 2001. The Yahoo adjustment
mis-valued the Axcelis distribution around December 2000/January 2001 and
inflated the computed result by about 22.5 percentage points. For 2018 the
archive cites Macrotrends dividend-adjusted -10.04% and independent dividend
arithmetic, versus the computed -11.59%. The archived state's run 3 critic
confirmed both corrections; its applied record and `corrections.json`
supersede the earlier "pending critic confirmation" wording. Cited source
details are retained in the [sanitized evidence record](historical-evidence.md#applied-return-and-metadata-decisions).

**Coverage boundary: DELL.** Today's DELL Class C began trading on
2018-12-28. The archived earlier 2017/2018 data reflects DVMT Class V tracking
stock, tied to VMware's economics, not the same security as DELL Class C.
Both series can be reproducible yet economically different. Keep 2019 as the
first full Class C year and retain the already reviewed 2019-2025 values;
do not splice DVMT into the current security. The state records special-agent
confirmation and the applied boundary.

**Methodology exception: AGG 2008 and 2009.** The early verification correctly
identified market-price versus NAV basis differences, initially calling the
market-price values internally consistent (`computed_right`). It is not the
final convention decision: the later run 3 special review in the archived
state explicitly chose NAV `0.0588` and `0.0514`, now in `corrections.json`.
Market-price 7.90%/2.97% reflects a premium to NAV at the end of 2008 and its
unwind in 2009. Sampling calendar years independently would treat that
linked crisis premium/reversal as repeatable volatility. NAV better
represents the chosen baseline economics for those two years. This is an
explicit exception, not a claim that market-price total return is erroneous
or that all ETF series should be converted to NAV.

**Metadata: GLD.** The final display label is `Gold (GLD)`. The recorded SPDR source and inception
evidence are listed in the [sanitized evidence record](historical-evidence.md#applied-return-and-metadata-decisions).
The name decision identifies gold exposure without altering the already
verified returns.

**Window and file policies.** Long-history assets retain the intentional 1995
analysis-window start even if their trading histories are much older; the
archive explains the correlation-matrix alignment. First-full-year flags
against that window were deliberately not treated as corrections. The
refreshed `sp500.json` remains unimported and pending explicit deletion
approval; it was not deleted by the prior refresh or this ledger task.
QQQ's duplicate in `indices.json` is retained and synchronized by historical
decision. Neither decision grants a future refresh permission to delete or
rewrite unrelated files.

## Provenance limits

The row rationales and cited source details are preserved in the
[sanitized historical evidence record](historical-evidence.md). It records
the citations and final decisions transcribed from the completed review,
without carrying over unrelated raw artifacts. The original fetched snapshots
and raw per-asset verification files are not committed, so this record is not
a byte-for-byte reproduction of those artifacts. No checksum is claimed for
unavailable original provider snapshot bytes.

The archive's `fetch_returns.mjs` and prior 45-asset verification are historical
evidence only, not maintained source acquisition or an active refresh command.
A newly reviewed CSV/JSON snapshot needs its own adjacent manifest, exact-byte
SHA-256, reviewer/date and applicable exception rationale/evidence. Inherited
decisions provide context, never a substitute for review of that selected
snapshot.
