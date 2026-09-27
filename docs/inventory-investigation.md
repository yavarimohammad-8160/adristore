# Inventory investigation — 2026-09-27

## Confirmed root cause

Both committed catalogs and the JSON served by adristore.ir had
`generatedAt: 2026-09-06T20:21:33.000Z`, 1,286 products, and 165 zero-stock products.
`scripts/build-cloudflare.mjs:shouldSkipPrebuild` unconditionally reused those files
whenever they existed. A code-only deployment did not refresh stock.
The products page and HomeCatalogProvider fetch these static JSON files first;
the admin Basalam listing instead calls lib/basalam.ts directly. This explains the
different stock values without a ProductCard bug.

Authenticated read-only requests to the actual v1 API returned HTTP 200:
`https://openapi.basalam.com/v1/vendors/1213430/products?page=1&per_page=100`.
All 13 pages were fetched: 1,286 unique products, matching total_count.
Every record had numeric `inventory`; 183 had inventory=0. Those unavailable
products ARE included in the list. `status.value=2976` means published: it also
appears on products with zero stock. One record had status 3567 (تایید نشده),
inventory=1; it is now non-purchasable. One record had `variant[].stock` as well as
aggregate inventory. Aggregate zero takes priority over variant quantities.
No speculative `variants`/`stocks` object schema was introduced.

The suggested api.basalam.com v2 and v3 vendor URLs returned 404. The actual v1
endpoint returned 401 without authorization. Tokens were never stored in fixtures.
The sanitized fixture contains real zero-stock, positive-stock and variant records.

Examples confirmed against list AND detail API responses:

| Product | Old catalog | Live inventory | Corrected catalog |
| --- | ---: | ---: | ---: |
| 57176519 | 1 | 0 | 0 |
| 57176431 | 1 | 0 | 0 |
| 57176328 | 1 | 1 | 1 |
| 57176181 | 1 | 1 | 1 |
| 21988759 | 0 | 4 | 4 |

29 raw inventory differences were found. Including the unapproved product,
30 catalog stock values changed. Both corrected catalogs retain all 1,286 products:
184 unavailable (183 zero-stock + 1 unapproved), 1,102 available.

## Other confirmed overwrite paths

- Manual duplicates discarded the live Basalam record, including its stock.
- applyProductOverride preferred override.inventory over the vendor inventory.
  The committed manual list was empty and its single override was inventory=0,
  so stale positive manual overrides were a reproducible defect, not the cause
  of these particular 29 live differences.
- Gallery enrichment spread the complete detail response over the list record.
  A conflicting detail could replace zero; gallery now preserves list stock/status.
- Missing products in a complete full sync could disappear. Full sync now retains
  previously published missing vendor products as unavailable. The stock-only
  updater instead verifies missing records via detail and aborts if it cannot.
- On API errors, mock detail previously fabricated inventory=12 even for arbitrary
  real product IDs. Production list/detail paths no longer return mock stock.
- `detail.inventory ?? fallback.inventory` already preserved zero. It is retained
  and regression-tested, including null/undefined fallback. NaN is NOT nullish;
  invalid numeric API data is normalized to zero before this stage.

## Fix and operation

`npm run sync:inventory` updates only inventory/status and inventoryUpdatedAt in
home-catalog.json and products-catalog.json. It preserves product IDs, titles,
prices, galleries, and series. It validates both catalogs before writing either.
Unknown/missing inventory or failed/incomplete API pagination aborts the update.
Run `node --import tsx scripts/refresh-catalog-inventory.ts` for a dry run.
Use the existing full sync to import newly added products.

Cloudflare builds that reuse committed media now refresh inventory whenever
BASALAM_TOKEN is configured and SKIP_BASALAM_PREBUILD is not 1. Failed authenticated
refreshes fail the build rather than silently substituting stale/mock quantities.
Without a token the build explicitly reports snapshot mode and uses the committed
JSON; a static site cannot observe later Basalam changes until the next sync and
deployment. No background schedule was added.

ProductCard's existing unavailable badge, details link and flip behavior are
unchanged. Its grey disabled purchase span was already present from commit 8b27551.
product-series.json contains series metadata/counts, not product stock; no change
was needed because no product or series membership was removed.

## Validation

- Compared every one of the 1,286 products in EACH JSON to the captured real API
  response after normalization: zero missing IDs, zero inventory mismatches.
- Nine automated tests (`npm run test:inventory`), including actual runBasalamSync
  execution with isolated external services. That integration test starts with old
  positive stock, conflicting manual/override/detail values, and a failed image
  download, then checks the exact local JSON and bytes sent for GitHub commit.
- Server-rendered the actual ProductCard for every product in both catalogs
  (2,572 renders): all unavailable cards have the badge and disabled span with no
  purchase link; all available cards retain the purchase link; details remain active.
- API 401, incomplete pagination, unknown stock, variant fallback, zero/nullish
  handling, and mixed/all-unavailable checkout regressions covered.
- `tsc --noEmit --incremental false` passed after the test fixes.
- ESLint had no errors; three existing unused-variable warnings remain.

## Changed code map

- lib/basalam.ts: list/detail error handling, uncached fetches, pagination guards,
  gallery stock precedence, exported normalization and observed variant/status mapping.
- lib/catalog-inventory.ts: shared live-over-manual stock merge and strict stock refresh.
- lib/basalam-sync.ts: shared merge; preserve fresh zero during previous-catalog reuse;
  retain delisted products without purchase availability.
- lib/product-overrides.ts: vendor stock wins over editorial overrides.
- lib/products.ts: shared manual merge; documented/tested nullish inventory enrichment.
- lib/prebuild-catalog.ts: strict complete fetch and shared stock merge.
- scripts/refresh-catalog-inventory.ts: stock-only live sync and dry-run report.
- scripts/build-cloudflare.mjs: refresh stock independently of committed images.
- scripts/prebuild-static-data.ts: stop authenticated refresh errors from using stale/mock stock.
- public/data/home-catalog.json and products-catalog.json: refreshed real inventory.
- package.json: sync:inventory and test:inventory commands; no dependency changes.
- tests/inventory.test.tsx and tests/fixtures/basalam-inventory.json: regression tests
  and sanitized actual API records.
