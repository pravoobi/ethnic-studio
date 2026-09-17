# Ethnic Studio

Hackathon entry for *Pixels to Products — Cloudinary AI Hackathon 2026*. Upload one flat photo of
an Indian ethnic garment, get a complete marketplace listing back — cutout, auto-tags, generative
backgrounds, color variants, and marketplace-ready crops.

See `CLAUDE.md` for full project context, architecture, and timeline. See `docs/progress.md` and
`docs/decisions.md` for current status and the reasoning behind every deviation from the plan.

## Setup

1. `pnpm install`
2. Create a free Postgres database at [neon.tech](https://neon.tech) — used for both local dev
   and prod (see `docs/decisions.md` for why).
3. Copy `.env.example` to `.env.local` and fill in your Cloudinary credentials and the Neon
   connection string.
4. `pnpm prisma migrate dev` (creates the schema on your Neon database)
5. `pnpm dev`

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — production build (must pass before every commit to `main`)
- `pnpm lint` / `pnpm typecheck`
- `pnpm test` — vitest unit tests for `lib/cloudinary/transforms.ts`
- `pnpm spike` — hand-tests every Cloudinary AI feature against photos in `fixtures/spike-photos/`
- `pnpm setup:metadata` — one-time, idempotent: creates the Cloudinary structured metadata fields
- `pnpm seed` — seeds demo garments from `fixtures/seed-photos/` (app must be running)
- `pnpm db:migrate:deploy` — applies pending migrations to prod (run once against Neon after
  first creating the database, and again after any future schema change)

## Deploying (Vercel)

1. Connect this repo in the Vercel dashboard.
2. Set every variable from `.env.example` in the Vercel project's Environment Variables —
   including `DATABASE_URL` (the same Neon connection string used locally is fine, or a separate
   prod database if you'd rather keep them apart).
3. Before or right after the first deploy, run `pnpm db:migrate:deploy` from your machine
   (pointed at whichever `DATABASE_URL` the deployment uses) — Vercel's build does not run
   migrations automatically, only `prisma generate` (via the `postinstall` script).
4. Once live, run `pnpm seed` with `SEED_BASE_URL` set to the deployed URL to populate demo
   garments, or seed against a local dev server first and reuse the same database.

## Hackathon toolkit

Per the [Cloudinary hackathon page](https://cloudinary.com/pages/hackathons/)'s requirement to
"use the React or Next.js AI Starter Kit and/or our AI Skills Pack" — this project uses the
**AI Skills Pack** (`.claude/skills/`, installed via `npx skills add cloudinary-devs/skills`),
the option Cloudinary's own docs recommend for an existing app rather than the starter-kit
scaffold. See `docs/decisions.md` for why.

## How Cloudinary is used

Every step in the pipeline (upload → cutout → smart crop → generative backgrounds/recolor →
structured metadata → Search API) is real, live Cloudinary API usage — see `CLAUDE.md`'s
"Cloudinary pipeline" section for the full breakdown and `docs/decisions.md` for what was
verified live against a real account (including two real bugs found and fixed that way).

## Status

Sep 28-29 (harden + deploy prep). Core pipeline, generative layer, and buyer catalog are all
built and verified live. See `docs/progress.md` for the full history.
