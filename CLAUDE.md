# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page Bulgarian-language catalog of companies that import cars
into Bulgaria (from the USA, Canada, EU, South Korea, Japan). The page is one
HTML file with an embedded React + Babel app that reads its data from a JSON
script block inside the same file. That JSON block is generated from
`companies.csv` by a small Ruby build script.

There is no server, no bundler, no package manager. Browsing `index.html`
directly with `file://` works.

## The three files

- **`companies.csv`** — the source of truth. One row per company. Edit this
  to add/change companies. Spreadsheet apps (LibreOffice/Numbers in EU
  locale) re-save with `;` as the delimiter; `build.rb` auto-detects `,` or
  `;` so either is fine.
- **`build.rb`** — reads `companies.csv`, minifies `app.js`, and rewrites
  four regions inside `index.html`:
  1. The `<script type="application/json" id="company-data">` JSON block
     the app consumes at startup.
  2. The `<ul>` inside `<div class="seo-static">` (the `<noscript>` SEO
     fallback list). Each `<li>` is wrapped in an `<a>` when the row has
     a `web` URL.
  3. The `<script type="application/ld+json" id="catalog-jsonld">` block
     in the head — schema.org `ItemList` of `AutoDealer` organizations for
     each non-hidden row (used by search engines).
  4. The `<script id="app-bundle">` block at the bottom of the body — the
     minified output of `app.js`. Run via `npx esbuild --target=es2020
     --charset=utf8 --minify`. If npx fails the raw source is inlined.
  Everything else in `index.html` is left byte-for-byte intact.
- **`app.js`** — the vanilla-JS app (no React, no framework). Reads the
  embedded JSON, renders the table via `innerHTML` + event delegation,
  manages sort state, drawer, popover and tooltips. Edit this to change
  the UI; `ruby build.rb` re-minifies it into `index.html`.
- **`index.html`** — head, styles, the React/Babel app, and the two
  regenerated regions. Open it in any modern browser to view the catalog.

## Commands

```
# Rebuild index.html after editing companies.csv (the only command you need)
ruby build.rb

# Quick syntax check without running
ruby -c build.rb
```

Ruby ≥ 3.0 is sufficient (uses only stdlib `csv`, `json`, `cgi`). Node /
`npx` must be on PATH so `build.rb` can shell out to `npx --yes esbuild`
when the React app needs to be recompiled. esbuild is fetched on first
run and cached by npx after that. No Gemfile, no package.json.

## CSV schema (36 columns)

| Group | Columns |
| --- | --- |
| Identity | `id` (kebab-case PK), `brand`, `legal`, `eik`, `eik_url`, `founded` (YYYY-MM-DD), `city`, `capital` (int), `capital_text`, `owner` |
| Group structure | `group`, `is_group_head` (`yes`/empty), `parent_brand_id` (FK → another row's `id`), `hide_from_list` (`yes`/empty) |
| Sources (boolean cells: `yes`/empty) | `source_usa`, `source_ca`, `source_kr`, `source_jp`, `source_eu` |
| Contact | `web`, `phone`, `phone_2`, `email` |
| Social (one URL per cell) | `social_facebook`, `social_instagram`, `social_viber`, `social_youtube`, `social_tiktok`, `social_linkedin`, `social_mobile_bg`, `social_cars_bg` |
| Status & narrative | `verified` (`yes`/empty), `is_new` (`yes`/empty), `blurb` |
| Audit (CSV-only — not emitted to JSON) | `last_checked` (YYYY-MM-DD), `verification_notes` |

The `hide_from_list=yes` rows still ship in the JSON but the React app filters
them out — they exist mainly for related legal entities the user shouldn't
mistakenly contact.

Phones in `companies.csv` are normalized to `+359 XXX XXX XXX` (or
`+359 2 XXX XXXX` for Sofia landline) by hand. The React app renders them
as-is — there is no client-side phone formatter.

## How `build.rb` transforms a row

`Build.row_to_company` (build.rb:35) maps CSV columns into the JSON shape the
React app expects:

- `eik_url` → `eikUrl`, `capital_text` → `capitalText`, etc.
- `yes`/empty boolean cells → `true`/`false` for `verified`/`isNew`; OMITTED
  entirely for `isGroupHead`/`hideFromList`/`parentBrandId` when not set
  (matches the legacy JSON's optional-key style).
- `source_*` columns collapse into `sources: ["USA", "CA", ...]` in a fixed
  order (`SOURCE_COLUMNS` map).
- `social_*` columns collapse into `social: [{label, url}, ...]`, including
  only populated columns (`SOCIAL_COLUMNS` map maps column → display label).
- `phone` + `phone_2` join with `" · "` separator when both present.

The audit columns (`last_checked`, `verification_notes`) are never emitted to
JSON — they're a hand-maintained audit trail that lives only in the CSV.

The noscript `<ul>` is regenerated to list every non-hidden brand. For each,
it shows `Brand (Legal)` when `legal` is a real registered name, or just
`Brand` when `legal` starts with `(` (placeholder text like
`(търговско име — North Auto group)`) or is `—`. See `real_legal_name?` in
`build.rb`.

## The React app (inside index.html)

- A `FEATURES` array near the top of the inline `<script type="text/babel">`
  block declares the columns and their groups (Основни / Внася от / Други
  канали). Each entry has `type` (`info`/`company`/`url`/`email`/`phone`/`value`).
- `transformCompany` (in the same script block) reshapes each row from the
  embedded JSON into the per-cell value objects the table renders.
- The `info_amount` column is a percentage bar computed from five "key"
  features in `INFO_KEY_IDS`: `registered`, `website`, `email`, `phone`,
  `viber`. Tie-break on the info column prefers companies with a registered
  legal entity.
- Default sort is `info_amount` desc. Click any column header to sort by it;
  same column toggles direction. Tiebreak is always alphabetical by brand.
- Clicking a cell in url/email/phone columns opens the link directly. The
  `company` column opens a popover with registry details. `value` (source)
  columns are non-interactive — the icon and label say everything.
- The Tooltip component renders via `ReactDOM.createPortal(..., document.body)`
  to escape the sticky-cell stacking context. Don't refactor it back into a
  plain child of the cell — it will be clipped behind the sticky group/column
  header.

## Editing workflow

1. Edit `companies.csv`. To add a new company: append a row with at minimum
   `id`, `brand`, and whichever feature columns you have data for; set
   `verified=yes`/`is_new=yes` if appropriate; set `last_checked` to today.
2. Run `ruby build.rb`.
3. Open `index.html` in a browser to inspect.
4. Commit both `companies.csv` and `index.html` together — the diff in
   `index.html` is just the two regenerated regions; anything else is a sign
   you accidentally hand-edited the HTML.

Never hand-edit the JSON inside `<script id="company-data">`, the `<ul>`
inside `<div class="seo-static">`, the JSON inside
`<script id="catalog-jsonld">`, or the JS inside
`<script id="app-bundle">` — those are generated artifacts that
`build.rb` will overwrite. To change the UI, edit `app.js`.

## CSS / layout gotchas

- `.table-scroll` is the horizontal scroll container. Its `overflow-x: auto`
  (CSS spec coercion) means sticky thead inside it does NOT track page scroll
  — the headers stick relative to the table's own scroll context. Don't try
  to "fix" this by removing the overflow; it traded off cleanly in past work
  (sticky-during-page-scroll required body-wide horizontal scrolling, which
  drags the hero with it).
- The first column (`.sticky-col`) and last column (`.endcell` / `.head-end` /
  `.ghead-end`) are both `position: sticky`. Their `::after` / `::before`
  pseudo-elements paint subtle gradient shadows when the table is scrolled
  away from the corresponding edge. `is-scrolled` (left shadow on) and
  `is-end` (right shadow off) classes are toggled by the tiny vanilla JS
  block at the bottom of `index.html`.
