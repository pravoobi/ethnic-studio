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
