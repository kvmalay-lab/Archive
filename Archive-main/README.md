# The Personal Aesthetic Archive — Engine

A lightweight, data-driven personal taste archive. No framework, no build step required to run it — open `index.html` in a browser or serve the folder with any static server.

## Philosophy

Architecture over content. The entire site is ~6 small JS files and a folder of JSON. Adding a product never means touching HTML or JS — only adding one JSON file (and a line in the manifest).

## Folder structure

```
archive/
  index.html              Single shell page — all views render into it
  css/
    style.css              All styling (one file, CSS variables for theme)
  js/
    data.js                Loads + indexes all JSON at runtime
    render.js               All DOM-building functions (grid, modal, filters, views)
    search.js                Search + filter logic
    router.js                 Hash-based routing (#/product/id, #/collection/id, #/article/id)
    app.js                    Boots everything, owns state, wires events
  data/
    products/
      *.json                One file per product (this is the entire product dataset)
    collections/
      *.json                One file per collection — references product IDs only
    articles/
      *.json                One file per editorial article
    index.json               Manifest listing every product, collection and article filename
                              (so the app knows what to fetch without a server-side directory listing)
  assets/
    images/
      thumbnails/            Small images for grid cards (~400px)
      hero/                  Large images for detail view (~1200px)
```

Every JSON file under `data/` must be listed in `data/index.json`, and every filename listed there must exist — the app trusts the manifest exactly and does not scan the folder. There is currently no `data/brands/` or `data/outfits/` type: earlier drafts of this dataset included them, but no view or loader ever consumed them, so they were removed rather than left as dead data.

All data files are pretty-printed with 2-space indentation and follow the canonical key order given in the schemas below — keep new/edited files consistent with that so diffs stay small and readable.

## Adding a new product

1. Create `data/products/<id>.json` following the schema below.
2. Add the filename to `data/index.json` under `"products"`.
3. Drop a thumbnail into `assets/images/thumbnails/<id>.jpg` and (optionally) a hero image into `assets/images/hero/<id>.jpg`.
4. Done. No code changes.

## Adding a new collection

1. Create `data/collections/<id>.json` — `id`, `name`, `description`, and a `productIds` array (this is the field the app actually reads; see schema below).
2. Add the filename to `data/index.json` under `"collections"`.
3. It will automatically appear as a card on the homepage, linking to `#/collection/<id>`.

## Adding a new article

1. Create `data/articles/<id>.json` following the schema below.
2. Add the filename to `data/index.json` under `"articles"`.
3. It will automatically appear in the Editorial section on the homepage, linking to `#/article/<id>`.

## Product schema

Only `id`, `name`, `brand`, and `category` are required for a product to render in a grid card without errors. Everything else is optional and, if present, is rendered in the product detail modal. All 29 shipped product files use this exact key order — new files should follow it too, omitting any key that doesn't apply rather than setting it to `null` or `""`.

```jsonc
{
  "id": "string, unique, kebab-case — must match the filename",
  "name": "string",
  "brand": "string",
  "category": "fragrance | clothing | footwear | watches | accessories",
  "subcategory": "string, e.g. 'Foundation tee', 'Lifestyle — terrace'",
  "thumbnail": "relative path or external URL — small image for grid",
  "heroImage": "relative path or external URL — large image for detail view",
  "additionalImages": ["array of paths/URLs, optional, currently unused by any view"],
  "price": "string, e.g. '₹8,999 – ₹11,000'",
  "price_usd": "string, optional USD equivalent — not currently rendered",
  "colours": ["array of strings"],
  "materials": ["array of strings"],
  "description": "string, 1-3 sentences — rendered as intro text under the title in the modal",
  "patina": "string — current wear/aging notes, rendered in the modal as 'Current Patina & Wear'",
  "whyThisFitsMyArchive": "string — rendered as 'Why This Fits'",
  "whyIChooseThis": "string — rendered as 'Why I Choose This'",
  "whatItPairsWithInMyCollection": "string — rendered as 'Styling Context'",
  "whatMakesItTimeless": "string — rendered as 'Longevity'",
  "whatProblemItSolves": "string, editorial research note — not currently rendered",
  "whatCouldReplaceIt": "string, editorial research note — not currently rendered",
  "similarPiecesIWouldProbablyLike": "string, editorial research note — not currently rendered",
  "archiveNotes": "string, editorial background note — not currently rendered (present on a few files only)",
  "stylingNotes": "string, editorial care/styling note — not currently rendered (present on a few files only)",
  "confidence": "number 0-100, shown as a percentage badge",
  "priority": "string, editorial metadata — not currently rendered",
  "status": "editorial metadata, currently always null — not currently rendered",
  "budgetAlternative": "string or null, editorial metadata — not currently rendered",
  "luxuryAlternative": "string or null, editorial metadata — not currently rendered",
  "india_availability": "string, optional sourcing note — not currently rendered",
  "indian_retailers": ["array of strings, optional sourcing note — not currently rendered"],
  "import_required": "boolean, optional sourcing note — not currently rendered",
  "similarProducts": ["array of product IDs — shown as related chips in the modal"],
  "relatedProducts": ["array of product IDs — shown as related chips in the modal"],
  "collections": ["array of collection IDs this product belongs to"]
}
```

`similarProducts` and `relatedProducts` are intentionally one-directional editorial callouts (product A can list B as related without B listing A back) — that's not drift, it's how the curation is meant to work, the same way a "you may also like" list on any product site isn't required to be symmetric.

`collections`, on the other hand, is a structural fact, not an editorial opinion — a product either belongs to a collection or it doesn't. It is kept in sync in both directions: every ID a product lists under `collections` appears in that collection's own `productIds`, and vice versa. If you add a product to a collection, update both files.

Any ID referenced in `similarProducts`, `relatedProducts`, or `collections` that doesn't correspond to a real file is silently skipped at render time (the fetch fails gracefully and the entry is filtered out) — but keep these lists accurate; dangling references are stale data, not a supported feature.

## Collection schema

```jsonc
{
  "id": "string, unique, kebab-case — must match the filename",
  "name": "string",
  "description": "string — shown as the collection's subtitle and piece count on its own page and as a card on the homepage",
  "introduction": "string, editorial metadata — not currently rendered",
  "philosophy": "string, editorial metadata — not currently rendered",
  "curatorNotes": "string, editorial metadata — not currently rendered",
  "heroImage": "relative path or external URL, optional — not currently rendered",
  "productIds": ["array of product IDs — the field the app actually reads to populate the collection page; see the note on collections above"],
  "colorPalette": ["array of strings, editorial metadata — not currently rendered"],
  "materials": ["array of strings, editorial metadata — not currently rendered"],
  "relatedCollections": ["array of collection IDs, editorial metadata — not currently rendered"]
}
```

`productIds` is the one field the collection view actually depends on — a collection with no `productIds` array renders as an empty page. Everything else is optional editorial metadata reserved for a future richer collection page.

## Article schema

```jsonc
{
  "id": "string, unique, kebab-case — must match the filename",
  "title": "string",
  "subtitle": "string",
  "author": "string",
  "date": "string",
  "readingTime": "string, e.g. '6 min'",
  "content": "string — paragraphs separated by \\n\\n",
  "relatedProducts": ["array of product IDs, shown as a product grid at the end of the article"],
  "relatedCollections": ["array of collection IDs, editorial metadata — not currently rendered"]
}
```

## Why JSON-per-file instead of one big array

Each product is independently editable, diffable in git, and the index manifest means the app only fetches what exists — this scales to thousands of files without any file growing unmanageable.

## Images during development

Every `thumbnail` / `heroImage` field currently points to a placeholder or a hot-linked external URL, most of which 404 or are blocked by the source site's CORS/ORB policy. This is expected and harmless: the `<img>` tags use `loading="lazy"` and have an `onerror` handler that falls back to a text placeholder showing the brand name, so a missing image never breaks a page. Replace these with local paths (e.g. `assets/images/thumbnails/samba-og.jpg`) once you've downloaded and optimized real images — swapping the URL is the only change needed.

## Running it

Any static server works:

```
cd archive
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

(Opening `index.html` directly via `file://` will fail in most browsers because `fetch()` on local JSON is blocked by CORS for the file protocol — use a local server.)
