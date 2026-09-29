# #ourfuds

Our family cookbook for the kitchen display: mostly whole-food, plant-based recipes, designed for a Google Nest Hub Max (1280×800, touch) cast from Home Assistant, and usable on phones and laptops. It is plain HTML, CSS and JavaScript — no build step, package install, account, backend, web font or CDN. Every asset is local and every path is relative, so the site works from a GitHub Pages project URL and inside a Cast receiver iframe.

| File | Purpose |
| --- | --- |
| `index.html` | The whole app (markup, styles, script and inline SVG illustrations). |
| `recipes.json` | Categories and recipes — the only file you edit to add a recipe. |
| `usage.json` | Optional committed snapshot of open counts. |
| `images/` | Local recipe photos plus [`CREDITS.md`](images/CREDITS.md) (sources and licenses). |
| `schema/recipes.schema.json`, `scripts/validate-data.mjs` | Data schema and the dependency-free validator. |
| `.github/workflows/validate-data.yml` | Runs the validator on every push. |

## What the app does

- **Home**: a compact greeting, then **On repeat** — five quick-access recipe cards (pinned first, then most opened, then alphabetical) — then **Explore the cookbook**, one illustrated picker per category in `recipes.json` order. Each picker shows a distinct botanical food illustration (assigned by position; the six designs repeat if you add more categories) and its recipe count.
- **Category page**: that category's recipes in the same pinned/usage/alphabetical order, with a **← Home** button. Empty categories open with a friendly empty state.
- **Recipe page**: photo hero with visible caption, times and yield, checkable ingredients (reset each time the recipe is opened), **1x / 1.5x / 2x** batch buttons, a serving +/- control when the yield is an exact number, steps and notes. The back button returns to the category you came from, or Home if you opened the recipe from On repeat.
- **Cooking mode**: one step at a time in very large text with big Previous/Next buttons, and a screen wake-lock request (status shown; degrades gracefully if unsupported or blocked).
- **Header**: a storage-status pill if counts cannot be saved, and **Export usage**. The footer links to the photo credits.

## Publish with GitHub Pages

A repository admin opens **Settings → Pages → Build and deployment**, chooses **Deploy from a branch**, selects `main` and `/ (root)`, and saves. The site is then served at the URL shown on that page — expected to be `https://tofu-pup.github.io/ourfuds/`. Confirm that both that URL and `…/recipes.json` load (HTTP 200) before casting. Every later commit to `main` redeploys automatically.

Pages sites are public: anyone with the URL can read the recipes, photos and usage snapshot. Keep private family information out of them.

## Preview and validate locally

From the repository directory run `python -m http.server 8000` and open `http://localhost:8000/` (opening `index.html` as a `file://` page cannot fetch the JSON). Run `node scripts/validate-data.mjs` before committing data changes; Node 18+ is needed only for the validator, not the app. The **Validate recipe data** workflow runs the same check on every push, so a malformed `recipes.json` or `usage.json` shows as a failed check. The validator enforces the schema plus unique IDs, known categories, existing image files with alt text and caption, and known IDs with nonnegative integer counts in `usage.json`.

## Add a recipe

Edit **only `recipes.json`**: add a new object to `recipes`, and, if needed, a new string to `categories`. Give the recipe a unique lowercase hyphenated ID. Commit the file. Refresh the display (or use DashCast's optional reload) to fetch the new file; the app requests `recipes.json` with a cache-busting query parameter on each page load. No HTML changes are needed. For a new photo, add a local file under `images/`, reference it via `image`, describe it in `imageAlt` and `imageCaption`, and record its reuse license in [image credits](images/CREDITS.md). An empty `image` keeps the initial-letter fallback.

The complete data shape is in [`schema/recipes.schema.json`](schema/recipes.schema.json):

| Field | Type | Meaning |
| --- | --- | --- |
| `categories` | nonempty array of unique, nonempty strings | Home picker names, in display order. A recipe's category must occur here. Empty categories remain navigable. |
| `recipes` | array of recipe objects | Can be empty. |
| `id` | unique lowercase slug (`a-z`, `0-9`, hyphens) | Stable key for usage counts; changing it starts a new count. |
| `title` | nonempty string | Card and detail heading. |
| `category` | string from `categories` | Exactly one category per recipe. |
| `tags` | array of unique, nonempty strings | Optional labels; use `[]` if none. |
| `pinned` | boolean | Pinned recipes always lead On repeat and their category list. |
| `servings` | positive integer, descriptive string, or `null` | Exact integer enables the serving +/- control. String (e.g. `"about 24 cookies"`) or `null` preserves the original yield without inventing an exact baseline. Batch-size multipliers still work for numeric quantities. |
| `prepTime` | nonnegative integer minutes or `null` | Unknown prep time is `null`. |
| `cookTime` | nonnegative integer minutes, descriptive string, or `null` | Use a string for approximate time (e.g. `"about 12 minutes"`), or `null` if unknown. The app does not calculate a total from unknowns. |
| `ingredients` | nonempty array of `{ "quantity", "unit", "item", "group"? }` | `quantity` is a nonnegative number or string, `unit` is a string (can be empty), `item` is nonempty. Optional nonempty `group` displays a heading when the group changes (e.g. `"Bunn"`). Numeric quantities, simple decimal/mixed/fraction strings and numeric ranges such as `"1-2"` scale; descriptive amounts and alternatives stay as written. Use `""` for an unmeasured ingredient. |
| `steps` | nonempty array of nonempty strings | Displayed in order, one at a time in cooking mode. |
| `notes` | string | Use `""` if none. |
| `image` | string | `""` for no photo (the card shows the recipe's initial letter), or a relative `images/…` path without `..`. A photo that fails to load falls back to the letter. |
| `imageAlt` | string, optional | Describe what the photo actually shows; required by validation when `image` is set. |
| `imageCaption` | string, optional | Visible caption identifying representative photos; required by validation when `image` is set. |

All recipe fields are required so scripts and iOS Shortcuts can append a predictable object; unknown values use the explicit representations above. Additional fields are rejected. Copy the shape of an existing entry in `recipes.json` and replace its ID and content.

The catalogue contains only the recipes supplied by the family, with no placeholder examples. Brownie kuler's yield and times were not supplied, so they are `null`; Health-nobs has an approximate yield and keeps its unclear source wording noted rather than guessing. Cashew kaker preserves its two ingredient groups and only the three provided instructions. Tofu bacon bits credits the original source in its notes and paraphrases the method.

## Photos and credits

The bundled photos are **representative** (related dishes or key ingredients, from Wikimedia Commons under CC0 / CC BY / CC BY-SA). Each card shows a *Representative* badge, and the recipe page captions what the photo really shows. Creators, sources, licenses and the resizing done are listed in [`images/CREDITS.md`](images/CREDITS.md), which the app's footer links to.

To use your own photo: save it under `images/` (landscape, roughly 960 px wide; WebP or JPEG), point the recipe's `image` at it, update `imageAlt` and `imageCaption` to describe it, and update or remove its row in `CREDITS.md`. If you delete a photo that is no longer used, delete its credit too. Only add images you took yourself or whose license allows reuse, and credit them as that license requires. Do not hotlink external images.

## Usage tracking

Opening a recipe increments its count. On repeat and each category list sort pinned first, then count descending, then title alphabetically, so a new device still shows a sensible, never-empty top row. `usage.json` is an optional committed object mapping recipe IDs to nonnegative integer counts, such as `{"brownie-kuler": 3}` (a missing file is allowed). On page load, the larger of the committed and locally stored counts wins per ID, so an old snapshot never reduces a local count. This is **not shared synchronization**: separate devices accumulate different counts; a committed snapshot is a manually updated baseline, not a live counter. IDs removed from the catalogue are ignored by the app and rejected in the committed snapshot by CI.

**Export usage** shows JSON ready to paste into `usage.json` or download as that file; commit it to preserve the snapshot. Export does not commit or upload automatically. The isolated `UsageStore` in `index.html` provides `get`, `increment`, `getMostUsed` and `export`; replace its storage implementation when introducing an authenticated shared backend, without changing recipe rendering. Do not expose a write-capable unauthenticated endpoint merely because Pages is public.

At startup the app tests a real localStorage write/read/remove. If blocked in an iframe or by the receiver, a visible status says counts are temporary for the current visit; the app still works using in-memory counts plus `usage.json`. Storage is origin/device-specific and may be cleared. If the snapshot cannot load, a visible warning says counts may be incomplete. Neither a successful desktop browser test nor a configured snapshot proves that localStorage works in DashCast. **Test on the actual Nest Hub**: opening/counting a recipe, reloading/recasting, persistence, export, checkboxes, touch targets and wake lock. The app cannot promise persistent usage on a Cast receiver; if storage is unavailable, commit exports from an environment where they can be saved or implement the shared backend.

Scaling: the **1x / 1.5x / 2x** buttons scale numeric amounts (including simple fractions and ranges) even when the yield is unknown, and leave free-text amounts and options unchanged. For an exact integer yield there is also a serving +/- control. Cast receivers may deny the cooking-mode wake lock; the app says so rather than failing.

## Cast from Home Assistant

Install [DashCast](https://github.com/AlexxIT/DashCast) via HACS → Integrations → Custom repositories, add `AlexxIT/DashCast` as an **Integration**, install, restart Home Assistant and add the DashCast integration. Its `dash_cast.load_url` action can point at the **verified live Pages URL**:

```yaml
action: dash_cast.load_url
data:
  entity_id: media_player.your_nest_hub
  url: https://tofu-pup.github.io/ourfuds/
  force: true
  reload_seconds: 3600
```

Replace the entity and URL with your real ones. `force: true` is DashCast's iframe-blocking workaround; it does not grant storage permission. `reload_seconds` is optional; reloading clears checkmarks and cooking progress, so choose an interval that will not interrupt cooking or omit it. This app itself uses no top-level navigation, popups or third-party resources.

[ha-catt-fix](https://github.com/swiergot/ha-catt-fix) is specifically a fix for the roughly ten-minute timeout **when casting the Home Assistant UI with CATT/DashCast**, by loading its JavaScript as a resource in that UI. In HACS, add `swiergot/ha-catt-fix` as a **Lovelace** custom repository and install it, then add the resource as its README instructs. Manual alternative: put `ha-catt-fix.js` in `/config/www/`, add `/local/ha-catt-fix.js` as a **module** under Settings → Dashboards → Resources (or under `lovelace.resources` in YAML mode, then restart Home Assistant). Its script runs inside a Home Assistant dashboard, **not** inside this standalone GitHub Pages app. Do not assume installing it will keep a directly cast Pages URL alive; test the actual Nest Hub session. For a HA dashboard that embeds this app, verify the iframe framing and interaction on the device.

If the display drops the page, prefer a manual recast (a dashboard button or script running the action above). If you automate it, make it cautious — only when the Nest is idle and during hours you want the cookbook shown — for example:

```yaml
alias: Recast cookbook when the kitchen display is idle
triggers:
  - trigger: state
    entity_id: media_player.your_nest_hub
    to: "off"
    for: "00:02:00"
conditions:
  - condition: time
    after: "07:00:00"
    before: "21:00:00"
actions:
  - action: dash_cast.load_url
    data:
      entity_id: media_player.your_nest_hub
      url: https://tofu-pup.github.io/ourfuds/
      force: true
mode: single
```

Check which state your Nest actually reports when idle (`off` or `idle`) before enabling it. Avoid unconditional periodic recasts: they interrupt other media, reset recipe progress and fight manual control. A Google Home routine that launches the cookbook (for example, via a Home Assistant script exposed to Google Home) is optional and must be set up and tested in your own environment. This repository performs no Home Assistant configuration.

## First test on the Nest Hub

Desktop tests cannot prove how a Cast receiver treats this page, so verify on the actual device after publishing:

1. Cast the live URL with `force: true`. The home screen, photos and category illustrations render inside the receiver, and touch works (On repeat → recipe → back; category → recipe → back → Home; ingredient checks; 1.5x; cooking mode Next/Previous).
2. Look at the header: no storage pill means the localStorage probe succeeded. A "Storage unavailable" pill means counts last only for the current visit.
3. Open one recipe two or three times, then tap **Export usage** and note its count.
4. Recast (or wait for a DashCast reload) and export again. The same or a higher count means persistence works; a reset means the receiver clears storage — rely on committed `usage.json` exports or a shared backend instead.
5. In cooking mode, note whether the wake-lock status says the screen will stay on.
