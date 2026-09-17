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
