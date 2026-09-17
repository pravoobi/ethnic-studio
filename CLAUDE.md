# CLAUDE.md — Ethnic Studio

Project instructions for Claude Code. Read fully before any task.

## What this is

**Ethnic Studio** (working name) is a hackathon entry for the *Pixels to Products — Cloudinary AI Hackathon 2026* (HackIndia, Sep 14 – Oct 3, 2026). Solo build.

One-line pitch: a seller uploads one flat photo of an Indian ethnic garment (saree, kurta, lehenga) and gets a complete marketplace listing back — clean cutout, auto-tags, generative lifestyle backgrounds, color variants, and marketplace-ready crops. Buyers can filter the catalog and jump to virtual try-on.

Problem: small Indian ethnic-wear sellers can't afford photoshoots. Every listing on Meesho/Amazon/Instagram needs multiple sizes, backgrounds, and color variants.

**Track:** Track 2 — Generative Content Workflows. **Decided 2026-09-17** — confirmed via live spike test that `e_gen_background_replace` and `e_gen_recolor` both work reliably on the free tier at ~0.1 credit/transform (see `docs/decisions.md`).

**Hard deadline:** submit by **Oct 2, 2026**. Oct 3 is buffer only.

Related: buyer-side try-on already exists at `github.com/pravoobi/try-on` (GitHub Pages). This project links out to it; do not rebuild try-on here.

## Submission requirements (non-negotiable)

- Cloudinary must do real work — upload, transform, tag, generate, deliver. Not just hosting.
- Live demo URL (Vercel)
- Public GitHub repo with setup instructions
- README explaining: track, problem, how Cloudinary is used, how to test
- 2–4 minute demo video
- Cloudinary feedback survey completed (cld.media/hackathon-survey) — no survey, no prize
- **Zero credentials in the repo.** Ever.

## Stack

- Next.js 15 App Router, TypeScript strict, Tailwind
- `cloudinary` Node SDK — server-side only (route handlers / server actions)
- `next-cloudinary` — `CldImage`, `CldUploadWidget` on the client
- Data: SQLite via Prisma for local dev, Turso/Neon for prod (keep the schema small; Cloudinary structured metadata is the source of truth for asset attributes)
- Deploy: Vercel
- Package manager: pnpm

## Commands

```
pnpm dev          # local dev
pnpm build        # must pass before every commit to main
pnpm lint
pnpm typecheck
pnpm test         # vitest, unit tests for transformation builders
pnpm seed         # seed demo garments (pre-processed, cached URLs)
```

## Environment

`.env.local` (never committed). Keep `.env.example` in sync.

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
DATABASE_URL=
NEXT_PUBLIC_TRYON_URL=https://pravoobi.github.io/try-on
```

Only `NEXT_PUBLIC_*` values may reach the browser. `API_SECRET` is server-only; if it appears in any client component or bundle, that is a bug to fix immediately.

## Architecture

```
app/
  (seller)/upload        # CldUploadWidget → signed upload → pipeline kickoff
  (seller)/dashboard     # processed assets, tags, variants, export
  (buyer)/catalog        # Search API filter view + "Try it on" link
  api/sign-upload        # signs upload params server-side
  api/pipeline/[id]      # runs post-upload steps (cutout/crop/tag/metadata), writes metadata
  api/pipeline/[id]/variants  # on-demand: generates background-replace + recolor variants
  api/export/[id]        # builds zip of marketplace crops
lib/
  cloudinary/
    client.ts            # SDK config (server only)
    transforms.ts        # pure functions that build transformation strings
    metadata.ts          # structured metadata read/write
    search.ts            # Search API wrappers
  presets.ts             # background prompts, export sizes, recolor palette
  pipeline.ts            # orchestrates steps, persists derived URLs
```

## Cloudinary pipeline (the product)

Every step below must be visibly attributable to Cloudinary in the README and demo.

1. **Upload** — signed upload with a preset that enables auto-tagging (add-on) and background removal (add-on) on upload.
2. **Cutout** — background removal output stored as a derived asset.
3. **Tag + metadata** — auto-tags mapped into structured metadata fields: `category`, `color`, `fabric`, `occasion`, `status`.
4. **Smart crops** — `c_auto` / `g_auto` for each export size.
5. **Generative backgrounds** — `e_gen_background_replace` with preset prompts: `studio-white`, `festive-mandap`, `lifestyle-instagram`.
6. **Color variants** — `e_gen_recolor` against a small palette (maroon, royal blue, emerald, mustard).
7. **Delivery** — every URL uses `f_auto,q_auto`.
8. **Search** — buyer catalog queries the Search API by metadata fields.

Export presets (in `lib/presets.ts`):
- Meesho: 1:1, 1024×1024
- Amazon: 2000×2000, white background
- Instagram: 4:5, 1080×1350

## Rules for Cloudinary usage

- **Credits are the scarce resource.** Generative transforms are expensive. Never generate on render. Generate once in the pipeline, persist the derived URL, serve the persisted URL.
- Use eager transformations at upload where possible so derived assets exist before the dashboard loads.
- Seed data must be fully pre-processed. The live demo must never trigger a generative call on page load.
- Wrap every Cloudinary call: log the operation, catch errors, surface a readable failure in the UI. A failed generation must not break the rest of the listing.
- Transformation strings are built only in `lib/cloudinary/transforms.ts` as pure functions with unit tests. No inline transformation strings in components.
- Check add-on activation status and free quota before relying on any add-on feature. If something isn't available on free tier, note it in `docs/decisions.md` and pick the fallback.

## Coding conventions

- TypeScript strict; no `any`. Zod for all API inputs.
- Server components by default; `"use client"` only for the upload widget and interactive filters.
- Small commits with clear messages. `pnpm build && pnpm typecheck` must pass before pushing to `main`.
- No new dependencies without a one-line justification in the commit message.
- Prefer deleting scope over adding it. If a feature isn't working by Sep 25, cut it and record why in `docs/decisions.md`.

## Timeline

| Dates | Goal | Done when |
|---|---|---|
| Sep 17–18 | Setup + spike | Account created, starter kit skimmed, **every AI feature tested on 3 real garment photos**, credit cost per feature noted, track decided |
| Sep 19–22 | Core pipeline | Upload → cutout → tags → crops → metadata, end-to-end, visible on dashboard. **This is the minimum submittable product.** |
| Sep 23–25 | Generative layer | Background presets, recolor variants, export zip. All derived URLs cached. |
| Sep 26–27 | Buyer side + polish | Catalog with Search API filters, try-on link, loading/error states, mobile layout |
| Sep 28–29 | Harden + deploy | Vercel live, 10–15 seeded garments, rate-limited upload route, repo credential audit |
| Sep 30 | Docs | README with architecture diagram, Cloudinary feature map, test walkthrough; `.env.example` current |
| Oct 1 | Video | 2–4 min: upload → tags → backgrounds → export → catalog → try-on; show Cloudinary console briefly |
| Oct 2 | Submit | Survey done, form submitted, links verified in incognito |

Update `docs/progress.md` at the end of each work session: what shipped, what's blocked, what's next.

## When working on a task

1. Check `docs/progress.md` and `docs/decisions.md` first.
2. State which timeline phase the task belongs to. If it's ahead of the current phase, ask before starting.
3. Don't touch generative features until the core pipeline (Sep 19–22 goal) is complete and committed.
4. After any change to `lib/cloudinary/*`, run `pnpm test`.
5. Before finishing, confirm no secrets were added to tracked files: `git diff --cached | grep -iE "api_secret|api_key"` should return nothing outside `.env.example`.

## Out of scope

- Rebuilding try-on here
- Auth / multi-tenant sellers (single demo seller is fine)
- Payments, order flow
- Video processing
- Anything not demonstrable in the video
