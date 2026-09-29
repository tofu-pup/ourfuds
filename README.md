# #ourfuds 🥄

Our family recipe box. It's a small static web app built for the kitchen's
**Google Nest Hub Max** (1280×800, landscape, touch). It's hosted on GitHub Pages
and cast from Home Assistant, and it works on phones and laptops too.

- **No build step and no dependencies.** It's plain HTML/CSS/JS in one
  `index.html`, with no CDNs, web fonts or libraries. If the Pages site is
  reachable, the app renders fully.
- **Recipes are data.** Adding a recipe means editing `recipes.json` only.
- **It's built for cooking.** Ingredients can be checked off, a servings
  scaler adjusts quantities, and cooking mode shows one step at a time in very
  large text while keeping the screen awake.

```
index.html               the whole app
recipes.json             all recipes and categories
usage.json               optional committed snapshot of "times opened" counts
images/                  optional recipe photos
schema/                  JSON Schemas for recipes.json and usage.json
scripts/validate.py      validator used by CI (and you, locally)
.github/workflows/       validate on every push, deploy to Pages when valid
```

---

## 1. Enable GitHub Pages

The workflow in `.github/workflows/validate.yml` validates `recipes.json` on
every push and pull request. It deploys to Pages **only if validation passes**,
so a malformed recipe can never replace the working site.

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to the default branch (`main`), or run the workflow by hand from the
   **Actions** tab (**Validate & deploy → Run workflow**).
4. The site appears at `https://<user>.github.io/<repo>/`. For this repo, that's
   `https://tofu-pup.github.io/ourfuds/`.

> Prefer the classic "Deploy from a branch" mode instead? That works too, since
> the app needs no build. You lose the safety net, though: a broken
> `recipes.json` would go live, and the validator would only flag it
> afterwards.

**Preview locally.** The app fetches JSON, so opening `index.html` straight
from disk (`file://`) won't work. Serve the folder instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

---

## 2. Add a recipe

Edit **only** `recipes.json`. Add an object to the `recipes` array:

```json
{
  "id": "lemon-drizzle-cake",
  "title": "Lemon Drizzle Cake",
  "category": "Baking",
  "tags": ["birthday", "vegetarian"],
  "pinned": false,
  "servings": 10,
  "prepTime": 20,
  "cookTime": 45,
  "ingredients": [
    { "quantity": 225, "unit": "g", "item": "self-raising flour" },
    { "quantity": "1 1/2", "unit": "cups", "item": "caster sugar" },
    { "quantity": 1, "unit": "pinch", "item": "salt" },
    { "quantity": null, "unit": "", "item": "Icing sugar, to dust" }
  ],
  "steps": [
    "Heat the oven to 180°C and line a loaf tin.",
    "Beat everything together, pour into the tin and bake for 45 minutes."
  ],
  "notes": "Drizzle while it's still warm.",
  "image": "images/lemon-drizzle-cake.jpg"
}
```

Commit it. CI checks the file, and within a minute or so the site has the new
recipe. Every load fetches `recipes.json?v=<timestamp>` with `no-store`, so
nothing stays stale in a cache.

**Tips**

- `id` must be unique, lowercase and hyphenated (`my-recipe-2`). **Don't change
  it after publishing**, because usage counts are keyed on it.
- For a new category, add it to `categories` (the order there is the order on
  the home page). The app needs no changes.
- Photos go in `images/`. Landscape works best, roughly 4:3 and at least
  800px wide. Leave `image` as `""` and the app shows a friendly emoji tile
  instead.
- **iOS Shortcuts / scripts:** the file is plain JSON with a single `recipes`
  array, so appending means "parse → add an item to `recipes` → write back". An
  easy Shortcut flow is *Get File → Get Dictionary from Input → get `recipes`
  → Add to Variable → Set Dictionary Value → Save File* (e.g. via Working Copy).
  Always include every required key. Use `""`, `[]`, `false` or `null` when
  you don't have a value.

**Check before you push:**

```sh
pip install jsonschema==4.26.0
python scripts/validate.py
```

---

## 3. Schema

The source of truth is [`schema/recipes.schema.json`](schema/recipes.schema.json)
(JSON Schema 2020-12). Unknown keys are rejected so typos get caught.

### Top level

| Key          | Type                      | Notes |
|--------------|---------------------------|-------|
| `categories` | array of `{ name, emoji? }` | Home page sections, in order. The default categories are Breakfast, Dinner, Soups, Snacks, Baking and Desserts. Empty categories still show, with a cheeky empty state. |
| `recipes`    | array of recipe objects   | See below. |

### Recipe

All keys are **required**.

| Key           | Type                  | Notes |
|---------------|-----------------------|-------|
| `id`          | string                | Unique slug: `^[a-z0-9]+(-[a-z0-9]+)*$`. Used in URLs (`#/recipe/<id>`) and usage counts. |
| `title`       | string                | 1–120 characters. |
| `category`    | string                | Must match a `categories[].name`. |
| `tags`        | array of strings      | Unique, shown as chips. May be `[]`. |
| `pinned`      | boolean               | Pinned recipes always lead the home page's top row. Keep it to 5 or fewer; the validator warns beyond that. |
| `servings`    | integer               | 1–100. The base amount for the scaler. |
| `prepTime`    | integer               | Minutes (0 if none). |
| `cookTime`    | integer               | Minutes (0 if none). |
| `ingredients` | array of ingredients  | At least one. |
| `steps`       | array of strings      | At least one. One step per item; each becomes a screen in cooking mode. |
| `notes`       | string                | Shown under the method. May be `""`. |
| `image`       | string or `null`      | `images/<file>`, an `https://` URL, or `""`/`null` for none. |

### Ingredient

| Key        | Type                       | Notes |
|------------|----------------------------|-------|
| `quantity` | number, string, or `null`  | Numbers (`2`, `0.5`); fractions (`"1/2"`); mixed numbers (`"1 1/2"`); unicode (`"½"`, `"1¾"`); ranges (`"2-3"`, `"2 to 3"`). Use `null` when there's no amount ("Salt and pepper, to taste"). |
| `unit`     | string                     | `"g"`, `"cup"`, `"tbsp"`, `"cloves"`, … or `""`. The app pluralises common units as they scale (1 cup → 2 cups). |
| `item`     | string                     | What it is, plus any prep ("onion, diced"). |
| `scale`    | boolean *(optional)*       | Set `false` to pin the amount when servings change (e.g. "1 baking tray"). |

**How scaling works.** Metric units (g, kg, ml, l…) scale as rounded decimals
and step up to kg/l past 1000. Other units snap to friendly fractions (⅛, ¼,
⅓, ½, ⅔, ¾…). These stay fixed: `null` quantities, `pinch`, `dash`, `splash`,
`drizzle`, `to taste`, `as needed`, `to serve`, and anything with
`"scale": false`. Scaled amounts are tinted so you can see what changed. Tap
the servings number to reset.

### `usage.json`

[`schema/usage.schema.json`](schema/usage.schema.json): a flat map of recipe
id → count (integer ≥ 0), e.g. `{ "sunday-pancakes": 12 }`. It's optional, and
`{}` is fine.

---

## 4. Usage tracking

Each time a recipe is opened, its count goes up by one. The counts drive:

- **the top row** on the home page, which shows 5 large cards: every pinned
  recipe first, then the most-used recipes, then alphabetical fill so the row
  is never empty or ragged;
- **each category section**, which lists recipes most-used first (ties go to
  pinned, then alphabetical).

With no usage data at all, the order is simply pinned first, then A→Z.

### The `UsageStore` module

All storage goes through one small module in `index.html`:

```js
UsageStore.get(id)            // → count
UsageStore.increment(id)      // → new count (persists in the background)
UsageStore.getMostUsed(n)     // → [{ id, count }, …]
```

It keeps counts in memory and hands persistence to a pluggable **backend**
(`{ available, reason, load(), save(counts) }`). Today's backend is
`createLocalStorageBackend()`. To share counts across devices later, write a
backend whose `load`/`save` talk to a server (e.g. a Home Assistant REST
endpoint) and pass it to `UsageStore.init()`. Nothing else changes.

### When storage is blocked

The Nest Hub runs the app **inside an iframe in a Cast receiver**, where
third-party storage can be partitioned or blocked. At startup the app actively
**writes, reads back and removes** a probe value. If any of that fails, or a
later save fails (e.g. quota), a small **"Counts not saved"** pill appears in
the home page header. Tap it to see why. Everything else keeps working, and counts
last until the page reloads.

### `usage.json`: your backup

The cast device may clear its storage, so you can commit a snapshot:

1. On a device that's been in use, scroll to the bottom of the home page and
   tap **Export usage**.
2. Copy the JSON and paste it into `usage.json`, then commit.

At startup the app merges `usage.json` with local counts and takes the
**higher** value for each recipe. A wiped device restores itself from the last
snapshot and never loses progress it already had. Also consider `pinned` for
the family favourites. Pins work even with no usage data at all.

---

## 5. Cast it to the Nest Hub from Home Assistant

The app is a normal web page, so anything that can cast a URL works. The usual
Home Assistant route is **DashCast**, the Cast receiver app for websites. You
drive it with [`catt`](https://github.com/skorokithakis/catt) (`cast_site`)
or with pychromecast's `DashCastController`, which is the library behind HA's
own Cast integration. (HA's built-in `media_player.play_media` doesn't
launch DashCast, so use one of these instead.)

### Option A: DashCast directly (simplest)

Add a shell command to `configuration.yaml`. `catt` needs to be installed
wherever Home Assistant runs (`pip install catt`), or call it over SSH on
another machine.

```yaml
shell_command:
  cast_ourfuds: >-
    catt -d "Kitchen display" cast_site https://tofu-pup.github.io/ourfuds/
```

Then call `shell_command.cast_ourfuds` from a script, an automation (e.g.
"when someone says *recipes*") or a dashboard button. `catt cast_site`
**always sends `force: true`** to DashCast.

Using pyscript or AppDaemon instead? The equivalent is:

```python
from pychromecast.controllers.dashcast import DashCastController
dc = DashCastController()
cast.register_handler(dc)
dc.load_url("https://tofu-pup.github.io/ourfuds/", force=True)
```

**Why `force: true`?** By default DashCast shows the page inside
an iframe. Sites that send `X-Frame-Options`/`frame-ancestors` headers refuse
to be framed, and you get a blank screen. With `force: true`, DashCast
navigates the receiver itself to the URL, so nothing can block the iframe. It
also makes #ourfuds a first-party page, so localStorage and the wake lock are
least likely to be restricted. The trade-off is that DashCast loses control
of the display, so it can't auto-reload the page. The app is still built to
run happily **framed**: it uses no top-level APIs, uses its own URL hash for
navigation, and has no `alert()` calls. It still works with `force=False`.

### Beating the 10-minute timeout: ha-catt-fix

A Cast receiver that isn't "playing" anything gets closed after about 10
minutes, and the Hub drops back to its ambient screen. Re-casting on a timer
is flaky. [**ha-catt-fix**](https://github.com/swiergot/ha-catt-fix) fixes it
by embedding a hidden Cast media player *inside a Home Assistant dashboard*
that plays a dummy image every ~9 minutes. Because it lives in an HA
dashboard, you cast **that dashboard** and show #ourfuds inside it:

1. Install ha-catt-fix via **HACS → Custom repositories** (category
   **Lovelace**/Dashboard), or copy `ha-catt-fix.js` to `/config/www/`. Then
   add it as a dashboard resource (`/local/ha-catt-fix.js`, type `module`).
2. Create a dashboard (e.g. `dashboard-kitchen`) with a single **Panel** view
   holding a **Webpage** card that points at `https://tofu-pup.github.io/ourfuds/`.
3. Cast that dashboard with catt, just like Option A, but point it at your
   Home Assistant URL (e.g. `https://<your-ha>/dashboard-kitchen/0`).
4. Remove any "re-cast every 10 minutes" automations.

In this setup #ourfuds runs framed inside the HA dashboard, so its storage is
third-party and may be partitioned or blocked. That's exactly what the
**"Counts not saved"** indicator (see §4) is for. If you see it, lean on
`pinned`, and export/commit `usage.json` from a phone or laptop now and then.
The top row stays sensible either way.

### Screen wake lock

Cooking mode requests the **Screen Wake Lock API** and shows **"Screen stays
on"**. If the browser or frame doesn't allow it, it shows **"Screen may sleep"**
and carries on normally. When you're cooking on a phone, that's the cue to
keep tapping. On the Hub, the active cast session keeps the display on anyway.

---

## Design notes

- System font stacks only (SF / Segoe / Roboto, with `ui-rounded` for the
  playful bits), so there's nothing to download.
- It's tuned for 1280×800 and legible across a kitchen: the root type size
  is 20px there, and tap targets are at least 55px. It adapts down to phones.
- There are no hover states, since the screen is touch-first. Transitions use
  spring-style easing and respect `prefers-reduced-motion`.
- Ingredient check-off gets a little pop and a strike-through sweep. Checks
  reset every time you reopen a recipe.
