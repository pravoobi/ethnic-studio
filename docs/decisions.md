# Decisions Log

## 2026-09-17 — Scaffold-only for Setup + spike phase

Scaffolded the full `app/`/`lib/` folder structure now, but kept every Cloudinary-touching module
(`lib/cloudinary/client.ts`, `metadata.ts`, `search.ts`, `lib/pipeline.ts`, and all three
`app/api/*` route handlers) as typed stubs that throw a clear "not implemented" error (or return
501) instead of real implementations.

**Why:** No Cloudinary account/credentials exist yet, and `CLAUDE.md`'s timeline puts real
Cloudinary integration work in the Sep 19-22 "Core pipeline" phase — one phase ahead of today
(Setup + spike, Sep 17-18). Writing real integration code against add-ons whose free-tier
availability hasn't been verified risks rework once hand-testing happens.

**What's real vs. stub:**
- Real: `lib/presets.ts` (preset constants), `lib/cloudinary/transforms.ts` (pure transformation-
  string builders, unit tested in `transforms.test.ts`).
- Stub (throws "not implemented" / returns 501): `lib/cloudinary/client.ts` config guard,
  `metadata.ts`, `search.ts`, `lib/pipeline.ts`, and `app/api/sign-upload`, `app/api/pipeline/[id]`,
  `app/api/export/[id]`.

## 2026-09-17 — Spike test results (real account, 3 real garment photos)

Ran `pnpm spike` against a real Cloudinary account (Master Admin key, "Standard development"
use) and 3 real garment photos. 36/39 checks passed after fixing two bugs discovered live
(see below). Full raw output in `docs/spike-results.json` (gitignored, local only).

**Works on this free-tier account, confirmed live:**
- Base upload.
- `background_removal` add-on (cutout) — works via a plain delivery URL (`e_background_removal`
  effect), no eager/upload-time param needed.
- Smart crop (`c_fill,g_auto`) for all 3 export presets — not an add-on, not credit-billed.
- `e_gen_background_replace` for all 3 background presets.
- `e_gen_recolor` for all 4 palette swatches.
- `colors: true` on upload/explicit — free, non-add-on dominant-color detection (hex list +
  Google/Cloudinary "predominant" named colors). Useful fallback for the `color` metadata field.
- Credit cost: account usage went from 0.59 → 2.62 credits (~2.03 credits) after testing 3
  background-replace variants × 3 photos + 4 recolor variants × 3 photos (21 unique generative
  transforms) — roughly **~0.1 credit per generative transform**. Free-tier limit on this
  account is 33.3 credits, so ~300+ generative transforms available for the whole hackathon.
  Crops/cutouts didn't move the usage number, consistent with them not being credit-billed.

**Does not work / not available on this account:**
- Auto-tagging via the "Google Auto Tagging" add-on (`categorization: "google_tagging"`) —
  fails with "You don't have an active subscription for Google Auto Tagging". This is a paid
  add-on subscription, not a free-tier quota limit; it will not become available without
  upgrading. **Fallback for the Sep 19-22 tag/metadata pipeline step:** derive `color` from the
  free `colors: true` dominant-color data confirmed above; `category` can be inferred from
  which upload flow/preset the seller picked (saree/kurta/lehenga) rather than auto-detected;
  `fabric`/`occasion` likely need seller input or a different, unverified tagging path — revisit
  if time allows, otherwise seller-entered fields are an acceptable scope cut per CLAUDE.md's
  "prefer deleting scope" rule.

**Two bugs fixed in `lib/cloudinary/transforms.ts` based on this live testing:**
1. `buildGenBackgroundReplaceTransformation` single-percent-encoded the prompt text. Cloudinary
   decodes a transformation path segment once while routing, then decodes each effect's text
   sub-param again while parsing it — so a literal comma/space in a single-encoded prompt gets
   misread as a transformation delimiter (`Invalid transformation component` error, confirmed via
   the `x-cld-error` response header). Fixed by double-encoding free text
   (`encodeURIComponent(encodeURIComponent(text))`), added as `encodeTransformationText()`.
2. `buildGenRecolorTransformation` used a `from-color`/`to-color` pair — wrong param. The real
   `e_gen_recolor` effect takes `prompt` (naming *what* to recolor, e.g. "garment") + `to-color`;
   there's no "from-color, recolor anything matching it" mode. Fixed the signature to
   `(paletteId, subject = "garment")`.

**Why this matters:** both bugs would have silently produced broken demo URLs (HTTP 400) if
first discovered during the Sep 23-25 generative-layer phase instead of now. Confirms Track 2's
core generative features (background replace, recolor) are real and free-tier-viable; the only
real gap found is auto-tagging, which is a metadata-pipeline concern, not a generative-features
concern.

## 2026-09-17 — Track decision: Track 2 (Generative Content Workflows)

Confirmed by the spike test above: `e_gen_background_replace` and `e_gen_recolor` — the two
generative features Track 2 is centered on — both work reliably on the free tier at ~0.1
credit/transform, well within the 33.3-credit budget for a demo with ~10-15 seeded garments.
The one failure found (auto-tagging add-on) affects metadata quality, not the generative
pipeline itself, and has a workable fallback (see spike results above). No reason to fall back
to Track 3.

**How to apply:** proceed with Track 2 as CLAUDE.md already assumes. Update the track line at
the top of `CLAUDE.md` to record this decision.

## 2026-09-17 — Core pipeline built; DB schema simplified further; dominant-color limitation

Built the real Sep 19-22 core pipeline (`lib/pipeline.ts`, `lib/cloudinary/metadata.ts`,
`app/api/sign-upload`, `app/api/pipeline/[id]`, the upload/dashboard UI) and verified it
end-to-end in a real browser against the real account — see `docs/progress.md` for the full
shipped list. Three decisions worth keeping a record of:

**1. `prisma/schema.prisma`'s `Garment` model dropped `originalUrl`/`cutoutUrl`.** Every derived
URL is deterministic from `publicId` + `lib/cloudinary/transforms.ts`'s pure builders, and the
pipeline's eager call guarantees Cloudinary already has them cached before the dashboard ever
requests them. Storing the URLs would just be a cache of a cache. The DB now only tracks
orchestration state (`id`, `publicId`, `status`, timestamps) — Cloudinary (via `publicId`) is
the only source for URLs and attributes, matching what CLAUDE.md already said about structured
metadata being the source of truth for attributes.

**2. Tagging fallback confirmed working, as planned in the spike-test decision above:**
`category` is seller-selected at upload (a `<select>` in `UploadForm.tsx`, validated server-side
against `GARMENT_CATEGORIES` via zod); `color` comes from `fetchDominantColor` (the free
`colors: true` analysis); `fabric`/`occasion` are written as blank strings — no source for them
yet. Live test wrote `{category: "saree", color: "Orange", status: "ready"}` to Cloudinary's
structured metadata successfully.

**3. Known limitation: `fetchDominantColor` reads the *original* image, not the cutout.** Live
test on a light-blue dress against a tan/beige backdrop returned "Orange" — the backdrop
dominated the pixel count. Cloudinary's Admin API doesn't expose a "colors of this specific
derived transformation" call; getting the cutout's actual dominant color would mean fetching the
cutout's bytes and running color analysis ourselves (a new dependency + real implementation
work). Left as-is for this phase — the pipeline is otherwise fully correct and this only affects
one metadata field's accuracy, not whether the feature works.

**Why this matters:** none of these three came from re-reading CLAUDE.md — all three came from
actually running the pipeline against a real account and a real photo. The schema simplification
in particular changes what was scaffolded on Sep 17; if anything downstream (a migration, a
script) still assumes `originalUrl`/`cutoutUrl` exist, that's now stale.

## 2026-09-17 — Generative layer built: backgrounds, recolor, export zip

Built the Sep 23-25 phase (`generateVariants` in `lib/pipeline.ts`, `app/api/pipeline/[id]/variants`,
`app/api/export/[id]`, dashboard updates) and verified all 9 images per garment (original, cutout,
3 backgrounds, 4 recolors) resolve live, plus a working export zip. Two things worth recording:

**1. Real bug caught before it shipped: `buildGenBackgroundReplaceTransformation` and
`buildGenRecolorTransformation` didn't append `f_auto,q_auto`.** `buildCutoutTransformation` and
`buildExportTransformation` already did. Eager pre-generation and the dashboard's render-time
URL have to be the *exact* same string to hit the same Cloudinary cache entry — if the dashboard
appended delivery but eager generation didn't, eager would silently stop actually warming
anything the dashboard requests, quietly reintroducing render-time generation for the most
expensive effects in the app. Fixed by appending delivery in both builders (matching the other
two), confirmed live: all 7 variant URLs resolved 200 immediately after generation, meaning they
hit cache rather than generating on that request.

**2. Generation is a manual "Generate backgrounds & colors" button per garment, not automatic
at upload.** `variantsGeneratedAt` on `Garment` gates both generation-triggering (button
disappears once set) and rendering (dashboard only constructs/shows the 7 variant URLs when set)
— constructing them beforehand would trigger render-time generation the first time anyone loads
the dashboard. Set only when *all 7* succeed, not on partial success, so a partial failure
leaves the button available for a retry (cheap — Cloudinary doesn't re-bill for the ones already
cached).

**Deferred to Sep 28-29 hardening, flagged now while it's fresh:** `generateVariants` makes one
synchronous `explicit()` call covering 7 generative transforms. Locally this completed in well
under Playwright's polling window, but Vercel's serverless function duration limits (10s on
Hobby by default) are a real risk once this deploys — if it times out in production, either
split the call into smaller batches, mark the eager call `eager_async: true` with a Cloudinary
webhook, or move generation off the request path entirely. Not solved now because it works
locally and Sep 28-29 is explicitly the "harden + deploy" phase.

**Test-script note (not an app bug):** the first two live-verification attempts looked like
failures because the Playwright driver's own polling condition was wrong (checked for the idle
button's label to disappear, but the pending state renders a different label, so it exited
early) and because the local db had just been reset by the DATABASE_URL fix above, so there was
no garment to click "Generate" on. Both were verification-script mistakes, not pipeline bugs —
worth noting so a future session doesn't waste time re-suspecting the app.

## 2026-09-17 — Buyer catalog built; real category-selection bug found and fixed

Built the Sep 26-27 phase: `lib/cloudinary/search.ts` (real `searchCatalog`), the buyer
`/catalog` page + `CatalogFilters.tsx`, `loading.tsx`/`error.tsx` for `catalog` and `dashboard`.

**1. Real bug found and fixed: the upload category dropdown never actually worked.**
`CldUploadWidget` (next-cloudinary) creates the underlying Cloudinary widget instance once,
lazily, on script load — and only ever invokes the `onSuccess` callback captured in *that first
render's* closure. `UploadForm.tsx` read the `category` React state directly inside that
callback, so every upload silently used whatever category was selected at mount time (the
default, "saree"), regardless of what the seller picked afterward. Confirmed live: both existing
garments in the account were tagged "saree" even though one was deliberately uploaded as
"kurta" during the generative-layer testing. Fixed with a ref
(`categoryRef.current = category` every render, read `categoryRef.current` inside the
callback) — a ref's `.current` is always live regardless of which render's closure ends up
being invoked. Corrected the mis-tagged garment's metadata directly via `writeStructuredMetadata`
equivalent (a one-off `uploader.explicit` call) so real filter testing had 2 distinct categories
to work with, then uploaded a 3rd (lehenga) to get all 3.

**Why this matters:** this bug would have silently mislabeled every seller's listing category
for the rest of the hackathon if it hadn't surfaced while building the very feature (category
filtering) that depends on that data being correct. General lesson for this codebase: any
prop passed to `CldUploadWidget` that needs the *current* value at the time of an async
callback should go through a ref, not be read directly from closure — the widget's one-time
creation model makes closures unreliable here.

**2. Search API expression syntax confirmed live** (`lib/cloudinary/search.ts`):
`folder="ethnic-studio/garments" AND metadata.status="ready" AND metadata.category="saree"` —
plain double-quoted string equality, `AND`-joined clauses, works exactly as documented. No
surprises here, unlike the transform-string bugs earlier — verified before committing rather
than assumed, per the pattern established in this project.

**3. Color filtering is in-memory, not a second Search API clause** — deliberate simplification
given the small catalog size (10-15 demo garments), not a limitation discovered live. See the
plan notes: `category` uses the Search API (a clean enum); `color` values are free-form strings
from `fetchDominantColor`, filtered over the already-fetched result set in the page component.

**4. No invented try-on query-param contract.** Each catalog card links to
`NEXT_PUBLIC_TRYON_URL` with no query params — the try-on repo's code isn't in this session, so
guessing a param contract (e.g. `?image=`) risked shipping a link that silently does nothing
useful. Revisit if/when the try-on repo's actual contract is confirmed.

**Mobile layout:** checked catalog/dashboard/upload at a 390px viewport — all three already
render correctly (single-column stacking, no overflow) using the grid/flex patterns already in
place; no changes needed.

## 2026-09-17 — Harden + deploy prep: Postgres unification, rate limiting, seed script

**1. Unified on Postgres (Neon) for both local dev and prod, dropping the sqlite-dev / Turso-
or-Neon-prod split CLAUDE.md originally described.** Prisma 6 (no driver adapters — deliberately
avoided when this project downgraded off Prisma 7 for the exact same complexity reason, see the
Sep 17 scaffold decision above) needs one `provider` per schema, and sqlite/postgresql migration
files aren't interchangeable. The schema is trivial (`Garment`, `UploadAttempt`) with nothing
sqlite-specific, so running the same real Postgres database in both environments means what's
tested locally is exactly what runs in prod — no provider drift to debug later. Deleted the old
sqlite migration history (`prisma/migrations/20260917053256_init`,
`.../20260917071934_add_variants_generated_at`) and the local `prisma/dev.db` file; a fresh
Postgres-provider migration gets created once a real Neon `DATABASE_URL` exists. Until then,
`.env.local`/`.env.example` hold a syntactically-valid placeholder Postgres URL so
`pnpm build`/`typecheck` keep working (Prisma Client validates the URL scheme at construction
time, even without connecting) — `pnpm dev` and anything touching the DB will fail until the
real URL is in place.

**2. Rate limiting on `POST /api/sign-upload` via a new `UploadAttempt` table, not a new
external service.** Vercel functions are stateless and run across multiple instances, so an
in-memory counter wouldn't actually limit anything once deployed. Since Postgres is now real and
shared between dev and prod anyway, a small table (`ipAddress`, `createdAt`) is the simplest
correct approach — 5 signed uploads per IP per 60-second window (`lib/rateLimit.ts`), with stale
rows swept on each check. **Fails open**: if the rate-limit check itself throws (e.g. DB
unreachable), the request proceeds rather than blocking every upload — a broken limiter
shouldn't take down the one thing sellers actually came to do.

**3. `pnpm seed` calls the real `/api/pipeline/[id]` route rather than reimplementing pipeline
logic in the script.** `scripts/seed.ts` uploads each photo in `fixtures/seed-photos/` to
Cloudinary directly (same standalone pattern as `scripts/spike-test.ts` — can't import
`lib/pipeline.ts` here, it pulls in `server-only`-guarded modules), then POSTs to
`/api/pipeline/[id]` exactly like the browser upload flow does. This means seed data is
generated through the identical code path as a real seller upload, with zero duplicated pipeline
logic to drift out of sync. Category comes from a `<category>-*` filename prefix convention
(documented in `fixtures/seed-photos/README.md`) since there's no UI driving a batch script.
Requires the app running (`pnpm dev`, or `SEED_BASE_URL` pointed at a deployed URL) — an
intentional trade-off for correctness over the convenience of a fully standalone script.

**4. Full-history credential audit: clean.** `git log --all -p | grep -iE "api_secret|api_key"`
across every commit and ref returned only variable-name references and doc prose, never a real
value; `.env.local` was never committed (only `.env.example` ever added); no suspicious
filenames (`*secret*`, `*credential*`, `*.pem`, `*.key`) in history. No action needed beyond
recording that the check was actually run, not assumed.

**5. Deploying to Vercel and creating the Neon database are the user's steps, not something I
execute** — per explicit direction. What's prepared here: `postinstall: "prisma generate"` so
Vercel's build produces a matching client, a documented one-time `pnpm db:migrate:deploy` step
(Vercel's build does not run migrations automatically), and every required env var listed in
`.env.example` with a comment on which ones are safe to expose client-side.

**6. Hackathon submission repo checked, linking deferred.** The team's actual GitHub repo
(`HackIndiaXYZ/pixels-to-products-cloudinary-ai-hackathon-2026-pravoo`) already exists but is an
empty placeholder (1 commit: `.gitignore`/`LICENSE`/a one-line README) — no remote is configured
on this local repo. Per the user: keep working locally for now, link and push before actual
submission rather than now. Recommended approach when that happens: `git remote add origin
<repo-url>`, then `git pull origin main --allow-unrelated-histories` (merges in their placeholder
commit without a destructive force-push), then push — not force-pushing over their initial
commit, even though its content is trivial.

## 2026-09-17 — AI Skills Pack installed instead of re-scaffolding onto a starter kit

The user asked whether the Cloudinary/HackIndia hackathon pages made using the React/Next.js AI
Starter Kit mandatory (they'd read it that way and asked me to create a fresh scaffold and
migrate this repo's files into it). Checked both pages directly rather than assuming either
reading was right. The actual wording on Cloudinary's page, under "Requirements":

> "Use the React or Next.js AI Starter Kit **and/or** our AI Skills Pack or AI Power Start
> Prompt."

An "and/or," not a strict mandate to use the scaffold. More importantly, the same page says
about the Skills Pack: *"If you have an existing app or want to use a different framework, try
our Skills Pack"* — describing exactly this situation. Re-scaffolding via `create-cloudinary-next`
and migrating 5 commits of working, live-verified code into it would have been real risk (broken
imports, lost history, regressions) for no requirement benefit, since the Skills Pack alone
satisfies that bullet on the existing repo.

**What was installed:** `npx skills add cloudinary-devs/skills -a claude-code -s '*' -y` — all 4
skills (`cloudinary-docs`, `cloudinary-next`, `cloudinary-react`, `cloudinary-transformations`)
copied into `.claude/skills/`, tracked in `skills-lock.json`. `.gitignore` updated to keep
`.claude/skills/` visible in the repo (everything else under `.claude/` stays ignored as local
harness state) — the point of the requirement is for the submission to demonstrably use it, so
it needs to actually be committed, not just present on this machine.

**Spot-checked `cloudinary-next`'s signed-uploads reference against the real bug found on
2026-09-17** (`CldUploadWidget` binding its `onSuccess` callback once, at first render, causing
the category dropdown to silently not work) — it isn't mentioned there either. Confirms that bug
was genuinely subtle enough that even Cloudinary's own curated guidance doesn't flag it; the
live-testing approach this project has used throughout still earns its keep alongside the Skills
Pack, not instead of it.
