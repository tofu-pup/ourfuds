# #ourfuds

A small family cookbook for a kitchen display. It is plain HTML, CSS and JavaScript: no build, account, backend, font download or CDN. Serve the directory over HTTP(S) (opening `index.html` as `file://` cannot fetch JSON). All paths are relative, including optional photos, so a GitHub Pages project URL works inside a Cast receiver iframe.

## Publish with GitHub Pages

In the repository, open **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select the PR's merged branch (normally `main`) and `/ (root)`, then save. After deployment, check the Pages URL shown there; for this repository it should be `https://tofu-pup.github.io/ourfuds/` **only after Pages has actually been enabled and deployed**. Pages must publish the branch containing `index.html`, `recipes.json` and `usage.json`. Before merging, a branch deployment is possible but changes the live source; do not assume the draft PR is live. Publishing a Pages site makes the recipes and usage snapshot publicly accessible. Do not put private family information in either file.

To preview locally, run `python -m http.server 8000` from the repository directory, then open `http://localhost:8000/`. No package install is needed. Validate edits with `node scripts/validate-data.mjs` (Node is only needed for the validator, not the app). The push workflow runs the same validator.

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
| `pinned` | boolean | Pinned recipes lead the recipe list within their category. |
| `servings` | positive integer, descriptive string, or `null` | Exact integer enables the serving +/- control. String (e.g. `"about 24 cookies"`) or `null` preserves the original yield without inventing an exact baseline. Batch-size multipliers still work for numeric quantities. |
| `prepTime` | nonnegative integer minutes or `null` | Unknown prep time is `null`. |
| `cookTime` | nonnegative integer minutes, descriptive string, or `null` | Use a string for approximate time (e.g. `"about 12 minutes"`), or `null` if unknown. The app does not calculate a total from unknowns. |
| `ingredients` | nonempty array of `{ "quantity", "unit", "item", "group"? }` | `quantity` is a nonnegative number or string, `unit` is a string (can be empty), `item` is nonempty. Optional nonempty `group` displays a heading when the group changes (e.g. `"Bunn"`). Numeric quantities, simple decimal/mixed/fraction strings and numeric ranges such as `"1-2"` scale; descriptive amounts and alternatives stay as written. Use `""` for an unmeasured ingredient. |
| `steps` | nonempty array of nonempty strings | Displayed in order, one at a time in cooking mode. |
| `notes` | string | Use `""` if none. |
| `image` | string | `""` for no image, or a relative `images/…` path. Missing photos fall back to a colored card. |
| `imageAlt` | string, optional | Describe what the photo actually shows; required by validation when `image` is set. |
| `imageCaption` | string, optional | Visible caption identifying representative photos; required by validation when `image` is set. |

All recipe fields are required so scripts and iOS Shortcuts can append a predictable object; unknown values use the explicit representations above. Additional fields are rejected. Copy the shape of an existing entry in `recipes.json` and replace its ID and content.

The catalogue contains only the recipes supplied by the family, with no placeholder examples. Brownie kuler's yield and times were not supplied, so they are `null`; Health-nobs has an approximate yield and keeps its unclear source wording noted rather than guessing. Cashew kaker preserves its two ingredient groups and only the three provided instructions. Tofu bacon bits credits the original source in its notes and paraphrases the method.

## Usage and cooking

The home screen keeps five **On repeat** quick-access recipe cards, followed by graphical category pickers from `recipes.json` instead of category-by-category recipe listings. Each picker gets a distinct decorative food illustration by its position (the six illustrations repeat if you add more categories); category names and membership still come exclusively from the JSON. Selecting a category opens its recipe list; **Home** returns to the pickers, and a recipe's back button returns to its category (or Home if opened from On repeat). Cards and details show local representative imagery, explicitly captioned when it does not depict the exact recipe. Replacing a photo with your own requires only updating the referenced image file and the JSON image descriptions, not the app. Opening a recipe increments its count. Both On repeat and each category sort pinned first, then by count descending, then title alphabetically. With no counts, the cards still show alphabetically ordered recipes. `usage.json` is an optional committed object mapping recipe IDs to nonnegative integer counts, such as `{"brownie-kuler": 3}`; the included empty `{}` can be removed (a missing file is allowed). On page load, the larger of the committed and locally stored counts wins per ID, so an old snapshot never reduces a local count. This is **not shared synchronization**: separate devices accumulate different counts; a committed snapshot is a manually updated baseline, not a live counter. IDs removed from the catalogue are ignored by the app and rejected in the committed snapshot by CI.

**Export usage** shows JSON ready to paste into `usage.json` or download as that file; commit it to preserve the snapshot. Export does not commit or upload automatically. The isolated `UsageStore` in `index.html` provides `get`, `increment`, `getMostUsed` and `export`; replace its storage implementation when introducing an authenticated shared backend, without changing recipe rendering. Do not expose a write-capable unauthenticated endpoint merely because Pages is public.

At startup the app tests a real localStorage write/read/remove. If blocked in an iframe or by the receiver, a visible status says counts are temporary for the current visit; the app still works using in-memory counts plus `usage.json`. Storage is origin/device-specific and may be cleared. If the snapshot cannot load, a visible warning says counts may be incomplete. Neither a successful desktop browser test nor a configured snapshot proves that localStorage works in DashCast. **Test on the actual Nest Hub**: opening/counting a recipe, reloading/recasting, persistence, export, checkboxes, touch targets and wake lock. The app cannot promise persistent usage on a Cast receiver; if storage is unavailable, commit exports from an environment where they can be saved or implement the shared backend.

Checkboxes reset when reopening a recipe. The explicit **1x / 1.5x / 2x** batch-size buttons scale numeric amounts (including simple fractions and ranges) even when yield is unknown; they leave free-text amounts and options unchanged. For an exact integer yield there is also a serving +/- control. Cooking mode shows one step at a time and attempts a screen wake lock; if unsupported or blocked it says so, and releasing/leaving cooking mode returns control to the device. Cast receivers may deny wake lock.

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

If your display drops the page, consider a cautious automation that offers a manual recast or casts only when the device is idle and your household wants the cookbook visible. Avoid unconditional ten-minute recasts: they interrupt other media, reset recipe progress, and can fight manual control. A Google Home routine that launches the cookbook may be convenient if supported by your devices, but is optional and must be configured/tested in your own Home/HA environment. No Home Assistant configuration is performed by this repository.
