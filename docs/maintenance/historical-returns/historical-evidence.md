# Historical Returns Review Evidence (Sanitized)

**Evidence period:** archived review completed 2026-07-07  
**Scope:** inherited methodology, selected coverage boundaries and applied exceptions only  
**Purpose:** Preserve a bounded, reviewable record of sources and findings cited by the completed historical-return review. This is not a new verification, a replacement for source snapshots, or a checksum of unavailable provider files.

The source citations below are transcribed from the archived per-asset verification records and review notes. The underlying raw work artifacts were not retained in this repository. Links identify the cited external source or issuer record; they do not assert that the source was re-fetched for this record. The separate summary of the archive's process and final decisions is in the [Phase 1 Plan 02 summary](../../../.planning/phases/01-source-contract-review-governance/01-02-SUMMARY.md#preserved-decisions).

## Full-calendar-year coverage boundaries

The recorded rule is to begin with the first complete calendar year of the current listed security or fund. Partial IPO/inception years are omitted. The source records paired the following decisions with the cited listing/inception or annual-history evidence:

| Decision | Asset | First year | Recorded evidence |
|---|---|---:|---|
| `start-AMZN` | AMZN | 1998 | [1Stock1 annual returns, 1998–2024](https://www.1stock1.com/1stock1_146.htm); the archived verification note records the NASDAQ IPO date as 1997-05-15 and excludes partial 1997. |
| `start-GOOGL` | GOOGL | 2005 | [Google annual returns](https://www.1stock1.com/1stock1_178.htm); [StockAnalysis company record](https://stockanalysis.com/stocks/googl/) cited for the 2004-08-19 IPO. |
| `start-TSLA` | TSLA | 2011 | [1Stock1 annual returns](https://www.1stock1.com/1stock1_2027.htm); the archived note records Tesla's 2010-06-29 IPO and exclusion of partial 2010. |
| `start-META` | META | 2013 | [Meta adjusted annual returns](https://www.macrotrends.net/stocks/charts/META/meta-platforms/stock-price-history); [IPO background](https://en.wikipedia.org/wiki/Initial_public_offering_of_Facebook), cited for the 2012-05-18 listing. |
| `start-RIVN` | RIVN | 2022 | [StockAnalysis company record](https://stockanalysis.com/stocks/rivn/) cited for the 2021-11-10 IPO; [Nasdaq historical data](https://www.nasdaq.com/market-activity/stocks/rivn/historical) is the reader-facing market-price history reference. The raw verification cited Nasdaq's chart API; the historical page replaces that API URL because the old request omitted required parameters. |
| `start-AVGO` | AVGO | 2010 | [StockAnalysis company record](https://stockanalysis.com/stocks/AVGO/) cited for the 2009-08-06 IPO; [total-return history](https://totalrealreturns.com/n/AVGO). |
| `start-NVDA` | NVDA | 2000 | [Total-return history](https://totalrealreturns.com/n/NVDA); the archived review records the 1999-01-22 IPO and treats 1999 as partial. |
| `start-GLD` | GLD | 2005 | [SPDR official historical archive (XLSX)](https://api.spdrgoldshares.com/api/v1/historical-archive?product=gld&exchange=NYSE&lang=en) cited for daily prices; the [SPDR issuer page](https://www.spdrgoldshares.com/usa/gld/) reports listing and inception on 2004-11-18. |
| `start-CME` | CME | 2003 | [1Stock1 annual returns](https://1stock1.com/1stock1_851.htm); archived review cites SEC filings and CME listing coverage for the 2002-12-06 first trade. |
| `start-UPS` | UPS | 2000 | [1Stock1 annual returns](https://www.1stock1.com/1stock1_307.htm); [StockAnalysis company record](https://stockanalysis.com/stocks/ups/) cited for the 1999-11-10 IPO. |
| `start-VTI` | VTI | 2002 | [Total-return history](https://totalrealreturns.com/n/VTI); [fund inception record](https://stockanalysis.com/etf/vti/) cited as 2001-05-24. |
| `start-QQQ` | QQQ | 2000 | [Total-return history](https://totalrealreturns.com/n/QQQ), which records partial-year 1999 separately; archived note identifies 1999 inception. |
| `start-IWM` | IWM | 2001 | [Total-return history](https://totalrealreturns.com/n/IWM); [fund inception record](https://stockanalysis.com/etf/IWM/) cited as 2000-05-22. |
| `start-AGG` | AGG | 2004 | [iShares fund performance/NAV series](https://www.ishares.com/us/products/239458/ishares-core-total-us-bond-market-etf); [fund inception record](https://stockanalysis.com/etf/agg/) cited as 2003-09-22. |
| `start-DELL` | DELL Class C | 2019 | Dell Technologies' [2018-12-28 Class V transaction announcement](https://investors.delltechnologies.com/news-releases/news-release-details/dell-technologies-completes-class-v-transaction) states DVMT ceased trading and DELL Class C began regular-way NYSE trading that day; the [SEC-filed transaction exhibit](https://www.sec.gov/Archives/edgar/data/1571996/000119312518360943/d673794dex991.htm) is the associated filing record. [Total-return history](https://totalrealreturns.com/n/DELL) is cited separately for return comparisons. The record distinguishes prior DVMT tracking-stock history from DELL Class C. |

## Applied return and metadata decisions

| Decision | Accepted record | Recorded source evidence and rationale |
|---|---|---|
| `value-AVGO-2018` | 0.0218 | [TotalRealReturns](https://totalrealreturns.com/n/AVGO), [FinanceCharts](https://www.financecharts.com/stocks/AVGO/performance), and [dividend history](https://dividendhistory.org/payout/AVGO/) were cited in the review. The record says two total-return sources and dividend arithmetic supported 2.18% over a Yahoo dividend-data artifact. |
| `value-ETN-2001` | 0.1681 | Eaton's [2002 DEF 14A cumulative TSR table](https://www.sec.gov/Archives/edgar/data/31277/000095015202001796/l91516adef14a.txt) was cited for dividends-reinvested TSR; SEC Eaton/Axcelis distribution filings were cited to explain the spin-off adjustment discrepancy. |
| `value-ETN-2018` | -0.1004 | [Macrotrends dividend-adjusted annual return history](https://www.macrotrends.net/stocks/charts/ETN/eaton/stock-price-history) and archived dividend arithmetic were cited; the final review records the value as critic-confirmed. |
| `value-AGG-2008` | 0.0588 (NAV total return) | [iShares fund performance](https://www.ishares.com/us/products/239458/ishares-core-total-us-bond-market-etf) was cited for NAV total return; the archived special review chose NAV to avoid treating the crisis-era market-price premium as repeated annual volatility. |
| `value-AGG-2009` | 0.0514 (NAV total return) | Same [iShares NAV source](https://www.ishares.com/us/products/239458/ishares-core-total-us-bond-market-etf); the review records that 2009 market-price performance includes reversal of the 2008 premium dislocation. |
| `name-GLD` | Gold (GLD) | [SPDR official historical archive (XLSX)](https://api.spdrgoldshares.com/api/v1/historical-archive?product=gld&exchange=NYSE&lang=en) and [TotalRealReturns](https://totalrealreturns.com/n/GLD) were cited in the final review; the [SPDR issuer page](https://www.spdrgoldshares.com/usa/gld/) identifies the fund, and the display name identifies gold exposure without changing returns. |

## Methodology and file governance

- **Return convention:** calendar-year total return with distributions reinvested, using prior year-end to current year-end (last trading day to last trading day). The archived review compared adjusted/total-return series and corroborating dividend records; the [TotalRealReturns methodology pages](https://totalrealreturns.com/) were among the cited cross-checks.
- **Units and precision:** decimal returns stored to four decimal places. This is the recorded preset convention, not a precision claim about the original provider observations.
- **Long-history window:** 1995 is an intentional application analysis-window start for long-history assets to align the correlation matrix; it is not asserted to be their first trading year. This design decision is recorded in the [Phase 1 Plan 02 summary](../../../.planning/phases/01-source-contract-review-governance/01-02-SUMMARY.md#preserved-decisions).
- **ETF scope:** preserve investable ETF-level return series rather than substitute index returns. For AGG 2008–2009 the later explicit NAV exception supersedes the earlier observation that market-price returns were internally consistent.
- **Preset-file decisions:** the prior review retained refreshed `sp500.json` pending explicit deletion approval and kept QQQ's duplicate entry in `indices.json` synchronized. These are file-governance decisions recorded in the [Phase 1 Plan 02 summary](../../../.planning/phases/01-source-contract-review-governance/01-02-SUMMARY.md#preserved-decisions); this record does not authorize new deletion or unrelated file changes.

## Evidence limits

The archived process reported that 45 assets were reviewed across three runs and that the listed corrections were applied. The record above preserves the source names/links and decision rationale needed to understand that review, but the original fetched snapshots and raw per-asset verification files are not included here. No source-byte SHA-256 is available for those historical snapshots, so none is asserted. Future refreshes must use their own explicitly selected reviewed snapshots, adjacent manifests, reviewer records, and exact-byte SHA-256 checksums as specified in the [source contract](source-contract.md).
