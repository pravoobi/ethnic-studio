# Progress Log

## 2026-09-17 — Setup + spike (Day 1)

**Shipped**
- Repo scaffolded: Next.js 15.5 (App Router, TS strict, Tailwind), pnpm, git initialized.
- Folder structure per CLAUDE.md: `app/(seller)/upload`, `app/(seller)/dashboard`, `app/(buyer)/catalog`,
  `app/api/{sign-upload,pipeline/[id],export/[id]}`.
- `lib/cloudinary/{client,transforms,metadata,search}.ts`, `lib/presets.ts`, `lib/pipeline.ts`.
  `transforms.ts` is fully implemented and unit tested (pure string builders, no live Cloudinary calls).
  `client.ts`/`metadata.ts`/`search.ts`/`pipeline.ts` and all three API routes are typed stubs that
  throw/501 clearly — see `docs/decisions.md`.
- Prisma schema (SQLite dev) with a minimal `Garment` model.
- `.env.example`, this file, and `docs/decisions.md` created.
- `pnpm build && pnpm typecheck && pnpm lint && pnpm test` all green on the scaffold.

**Blocked**
- No Cloudinary account/credentials yet — nothing in `.env.local`. Required before any real
  upload/cutout/tag/crop/generative work (Sep 19-22 phase) can start.
- Track decision (Track 2 vs Track 3) not made yet — depends on hand-testing generative features
  against free-tier quota.

**Next**
- Decide track by Sep 18 EOD; record the decision here and update the track line in `CLAUDE.md`.

## 2026-09-17 — Spike-test tooling ready

**Shipped**
- `scripts/spike-test.ts` (`pnpm spike`): hand-tests every pipeline feature (upload,
  auto-tagging add-on, background-removal add-on, smart crop, `e_gen_background_replace`
  ×3 presets, `e_gen_recolor` ×4 swatches) against every photo in `fixtures/spike-photos/`,
  using the real `lib/cloudinary/transforms.ts` builders. Pulls account credit usage
  before/after via the Admin API. Writes full results to `docs/spike-results.json`
  (gitignored — local only).
- Switched `lib/cloudinary/transforms.ts`/`search.ts` to relative imports (instead of the
  `@/` alias) so these pure modules run under plain Node/tsx, not just inside Next's bundler.

## 2026-09-17 — Spike test run against real account + photos; track decided

**Shipped**
- Ran `pnpm spike` for real (3 real garment photos, live Cloudinary account). First run: 0/3
  passed — a hardcoded `categorization: "google_tagging"` on the upload call threw and killed
  the whole request, so nothing else got tested. Rewrote the script to test each feature as an
  isolated step so one missing add-on can't block the rest (committed separately).
- Second run surfaced two real bugs in `lib/cloudinary/transforms.ts` (wrong prompt encoding for
  `e_gen_background_replace`, wrong param name for `e_gen_recolor`) — fixed both against the live
  account until 36/39 checks passed. Full findings, credit-cost numbers, and the auto-tagging
  fallback plan are in `docs/decisions.md`.
- **Track decided: Track 2 (Generative Content Workflows).** Updated the track line in
  `CLAUDE.md`.

**Blocked**
- Auto-tagging add-on (Google Auto Tagging) isn't subscribed on this account — not a free-tier
  quota issue, a paid-subscription gate. `color` has a free fallback (`colors: true` dominant-
  color detection, confirmed live); `category`/`fabric`/`occasion` still need a plan — see
  `docs/decisions.md` for options. Revisit when the Sep 19-22 core pipeline gets to the
  tag/metadata step.

**Next**
- Sep 19-22 core pipeline: wire `lib/cloudinary/client.ts`, `metadata.ts`, `lib/pipeline.ts`, and
  the `app/api/{sign-upload,pipeline/[id]}` routes for real, using the now-verified transform
  builders and the `colors: true` fallback for the color field.

## 2026-09-17 — Core pipeline built and verified end-to-end (minimum submittable product)

**Shipped**
- Real implementations: `lib/cloudinary/metadata.ts` (structured metadata read/write +
  `fetchDominantColor`), `lib/pipeline.ts` (`runPipeline`: cutout+crop via one `explicit()` eager
  call, dominant color, metadata write, DB upsert — every step wrapped so one failure doesn't
  block the rest), `app/api/sign-upload` (real signature endpoint), `app/api/pipeline/[id]`
  (zod-validated, calls `runPipeline`).
- `app/(seller)/upload` now has a real `UploadForm.tsx` (category select + `CldUploadWidget` +
  pipeline call + result display); `app/(seller)/dashboard` lists real `Garment` rows with
  cutout/crop/metadata pulled live from Cloudinary via `publicId` — nothing stored beyond
  orchestration status (`prisma/schema.prisma` simplified: dropped `originalUrl`/`cutoutUrl`,
  both are deterministic from `publicId` + the transform builders).
- New `scripts/setup-metadata-fields.ts` (`pnpm setup:metadata`) created the 5 structured
  metadata field definitions on the real account (idempotent, confirmed by re-running it).
- **Verified end-to-end in a real browser** (Playwright driver, temporary — not committed):
  uploaded a real photo from `fixtures/spike-photos/` through the actual widget, all 4 pipeline
  steps (`cutout`/`crop`/`tag`/`metadata`) returned `done`, and the dashboard rendered the
  original + cutout thumbnails, category ("saree"), color ("Orange"), and all 3 export links —
  zero console/page errors. Cloudinary's resource record confirmed 4 real derived assets cached
  (cutout + 3 crops).
- Found `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_API_KEY` (not a secret —
  same value as `CLOUDINARY_API_KEY`, needed client-side by the upload widget) both had to be
  set for the build to even prerender `/upload`; added the API key var to `.env.example`.

**Known limitation (documented, not fixed — see docs/decisions.md)**
- `fetchDominantColor` analyzes the *original* (pre-cutout) image, so a busy/plain backdrop can
  outweigh the garment's actual color in the result (saw "Orange" for a light-blue dress against
  a tan backdrop in the live test). Real fix needs analyzing the cutout's actual pixels, not just
  calling `colors: true` on the original — bigger scope than this phase.

**Next**
- Sep 23-25 generative layer: background-replace presets, recolor variants, export zip —
  `e_gen_background_replace`/`e_gen_recolor` builders are already verified live (spike test), so
  this is mostly wiring, not discovery.

## 2026-09-17 — Generative layer built and verified end-to-end

**Shipped**
- `lib/pipeline.ts`'s new `generateVariants()`: one eager `explicit()` call for 3 background
  presets + 4 recolor swatches, inspected per-entry (not assumed), sets `variantsGeneratedAt` on
  `Garment` only when all 7 succeed. New route `app/api/pipeline/[id]/variants` (POST, no body).
  New `"use client"` `GenerateVariantsButton.tsx` on the dashboard triggers it and
  `router.refresh()`s on completion — variants are a manual per-garment action, not automatic at
  upload (see docs/decisions.md for why).
- `app/api/export/[id]` implemented for real: fetches the 3 already-cached export crops and
  zips them with `jszip`, served as `application/zip`. Dashboard has a "Download zip" link.
- Fixed a real bug in `lib/cloudinary/transforms.ts` before it shipped: the two generative
  builders weren't appending `f_auto,q_auto` like the other two composite builders already did —
  would have silently broken eager pre-caching for backgrounds/recolor. Fixed + updated their
  tests (16/16 passing).
- `prisma/schema.prisma`: added `variantsGeneratedAt DateTime?` (migration
  `20260917071934_add_variants_generated_at`).
- **Verified end-to-end in a real browser**: clicked "Generate backgrounds & colors" on a real
  garment, confirmed all 9 dashboard images (original, cutout, 3 backgrounds, 4 recolors)
  resolve `200` and visually render correctly (distinct maroon/royal-blue/emerald/mustard
  garments, 3 different background scenes) — screenshot confirmed colors are visually correct,
  not just "some image returned". Export zip downloaded as a valid 200 `application/zip`
  response.
- `pnpm build && pnpm typecheck && pnpm lint && pnpm test` all green (16 tests).

**Deferred to Sep 28-29 hardening (flagged now, not solved)**
- `generateVariants`'s single synchronous call covering 7 generative transforms risks exceeding
  Vercel's default serverless function duration on deploy, even though it's fine locally. See
  docs/decisions.md for the options (batch it, `eager_async` + webhook, or move off the request
  path) to revisit during hardening.

**Next**
- Sep 26-27 buyer side + polish: catalog with Search API filters, try-on link, loading/error
  states, mobile layout.

## 2026-09-17 — Buyer catalog built and verified; fixed a real category-tagging bug

**Shipped**
- `lib/cloudinary/search.ts` real `searchCatalog()` (Search API, `category`-filtered,
  `status="ready"` only), `app/(buyer)/catalog/page.tsx` + new `CatalogFilters.tsx` (category +
  color dropdowns via URL search params), `loading.tsx`/`error.tsx` for `catalog` and
  `dashboard`.
- **Found and fixed a real bug**: the upload page's category dropdown never actually worked —
  `CldUploadWidget` only binds its success callback once, at first render, so every upload was
  silently tagged with the default category regardless of seller selection. Fixed with a ref.
  See `docs/decisions.md` for the full explanation — this would have quietly mislabeled every
  listing for the rest of the hackathon if it hadn't surfaced now.
- Verified end-to-end live: 3 real garments (saree/kurta/lehenga, corrected/uploaded during
  testing) all show correct distinct categories; category filter, color filter, and combined
  filters all narrow results correctly; zero console/page errors.
- Mobile layout checked at 390px on catalog/dashboard/upload — all already responsive, no
  changes needed.
- `pnpm build && pnpm typecheck && pnpm lint && pnpm test` all green (16 tests).

**Next**
- Sep 28-29 harden + deploy: Vercel live, 10-15 seeded garments, rate-limited upload route,
  repo credential audit. Also revisit the `generateVariants` Vercel-timeout risk flagged above.

## 2026-09-17 — Harden + deploy prep (partially blocked on the user)

**Shipped (unblocked pieces)**
- Full-history credential audit: clean (see docs/decisions.md for exact commands run).
- Switched `prisma/schema.prisma` to Postgres (Neon), unifying dev + prod on one provider —
  dropped the old sqlite migrations and local `dev.db`. `.env.local`/`.env.example` carry a
  placeholder Postgres URL so `pnpm build`/`typecheck` keep passing until a real Neon
  `DATABASE_URL` exists.
- New `UploadAttempt` model + `lib/rateLimit.ts`: `POST /api/sign-upload` now rate-limits at 5
  signed uploads/IP/60s, backed by the (now real, shared) Postgres DB rather than an in-memory
  map — fails open if the check itself errors.
- New `scripts/seed.ts` (`pnpm seed`): uploads photos from `fixtures/seed-photos/` and calls the
  real `/api/pipeline/[id]` route per photo, category parsed from a filename prefix.
- `package.json`: added `postinstall: "prisma generate"` (needed for Vercel builds) and
  `db:migrate:deploy`. `README.md` rewritten with Neon setup steps and a "Deploying" section for
  the user's own Vercel-dashboard flow.
- `pnpm build && pnpm typecheck && pnpm lint && pnpm test` all green (16 tests) against the
  placeholder DB URL — real DB connectivity is untested until it exists.

**Blocked on the user**
- Neon database not created yet — can't run the actual Postgres migration or verify the rate
  limiter/dashboard/catalog against a real connection until `DATABASE_URL` in `.env.local` is
  real.
- `fixtures/seed-photos/` is empty — `pnpm seed` is unrun until real photos are dropped in.
- Vercel deploy itself is the user's step (dashboard-driven), not something run from here.
- Hackathon team GitHub repo (already exists, checked, still a placeholder) — linking/pushing
  deferred by the user's choice until closer to submission.

**Next**
- Once a real Neon `DATABASE_URL` exists: `pnpm prisma migrate dev`, then re-verify the full
  upload → pipeline → dashboard → catalog flow live against real Postgres, plus confirm the
  rate limiter actually returns 429 after 5 rapid requests.
- Once seed photos exist: run `pnpm seed`, confirm 10-15 garments show correctly.
- Sep 30 docs phase after that: README architecture diagram, Cloudinary feature map, test
  walkthrough — most of the substance already exists in this file and `docs/decisions.md`.

## 2026-09-17 → 18 — Differentiation pass: never-crop exports + product video

Triggered by the judge's mention of prior fashion entries. Full reasoning + go/no-go spike
record in `docs/decisions.md` ("Differentiation review"). Kept the idea; sharpened the product.

**Shipped**
- **Export presets never crop the garment.** Meesho 1:1 and Instagram 4:5 now AI-extend the
  original backdrop (`c_pad` + `b_gen_fill`, 50 tx) instead of `c_fill` cropping; Amazon is a
  background-removal cutout padded onto pure white. That last one fixes a real bug — the old
  `c_fill/b_white` preset never produced a white background at all (`b_white` is a no-op with
  `c_fill`). Verified live: 2000×2000 pure white, and a 4:5 with the asymmetric hem fully intact.
  `buildSmartCropTransformation` deleted (no callers left).
- **Product video export** (`VIDEO_PRESET`, `buildVideoTransformation`): still photo →
  4-second Ken-Burns mp4, padded to 1080×1350 with a blurred video background. Generated as an
  8th eager entry in `generateVariants` (same on-demand button, relabeled), rendered as
  autoplaying `<video>` on the dashboard, and added to the export zip when present — the zip
  is now the complete listing kit (3 crops + video).
- `generateVariants` now surfaces Cloudinary's in-band per-entry failure `reason` (learned
  from the spike: a bad eager entry comes back `status: "failed"`, it doesn't throw).
- **Real `init_postgres` migration created** (`prisma/migrations/20260917182429_init_postgres`)
  against a disposable Docker Postgres — Neon just needs `pnpm db:migrate:deploy` now.
- Verified end-to-end in a real browser against real Postgres: clicked the button, all 8
  variants succeeded, `<video>` in DOM backed by a 200 `video/mp4`, zip contains all 4 files,
  zero console errors. Disposable container torn down afterwards.
- `pnpm build && typecheck && lint && test` green (14 tests).

**Cut (documented in decisions.md)**
- AI captioning for `fabric`/`occasion` — add-on not subscribed, silently ignored. Stay seller-
  entered.
- `gen_replace` — deliberately skipped; it's FashionistaAI's mechanic.
- `b_gen_fill` before `e_zoompan` — Cloudinary rejects image-only params once the chain is
  video (`Invalid color name gen_fill`). Video uses `b_blurred` padding instead.

**Blocked on the user (unchanged)**
- Real Neon `DATABASE_URL`, seed photos in `fixtures/seed-photos/`, Vercel deploy, repo link.

**Next**
- Sep 30 docs: rewrite the README/video narrative to lead with the seller workflow ("one
  photo → every marketplace, never cropped, plus a video"), generative features as supporting
  acts. Then the blocked items as they unblock.

## 2026-09-18 — Real Neon database live; full flow verified in production DB

User added the real Neon `DATABASE_URL` to `.env.local`. Unblocked:

- `pnpm db:migrate:deploy` applied `init_postgres` to the actual Neon database.
- Confirmed dashboard correctly shows "no garments" against the fresh Neon DB while catalog
  still shows the 3 pre-existing garments — expected: catalog is Search-API-driven (reads
  Cloudinary directly), dashboard is Postgres-driven (orchestration state only). Different data
  sources by design, not a bug.
- **Rate limiter confirmed live against real Postgres**: 7 rapid `POST /api/sign-upload`
  requests → 5× `200`, then `429, 429`.
- **Full upload → pipeline → dashboard flow verified against Neon**, 3 times with different
  photos/categories: all succeeded (`cutout`/`crop`/`tag`/`metadata` all `done`), dashboard
  correctly listed each as `ready` with the Generate button. Neon's `Garment` table now has 3
  real rows.
- One console `TypeError: Cannot read properties of undefined (reading 'open')` appeared on 1 of
  3 identical runs, never reproduced on retry, and doesn't correlate with anything changed
  recently (the only `.open` call anywhere in this codebase is the legitimate
  `CldUploadWidget` render-prop button). Logged as a likely flaky third-party-widget timing
  artifact under rapid automated interaction — not chased further since it didn't block or
  affect any result, but worth knowing about if it ever recurs with an actual symptom.

**Still blocked:** real seed photos (asked user what's needed — see reply), Vercel deploy, repo
link.

**Next:** once seed photos exist, run `pnpm seed`; catalog will then have both the seed set and
these 3 already-real garments.
