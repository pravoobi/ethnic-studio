# Ethnic Studio

Hackathon entry for *Pixels to Products — Cloudinary AI Hackathon 2026*. Upload one flat photo of
an Indian ethnic garment, get a complete marketplace listing back — cutout, auto-tags, generative
backgrounds, color variants, and marketplace-ready crops.

See `CLAUDE.md` for full project context, architecture, and timeline. See `docs/progress.md` and
`docs/decisions.md` for current status.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in your Cloudinary credentials and a local
   `DATABASE_URL`.
3. `pnpm dev`

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — production build (must pass before every commit to `main`)
- `pnpm lint` / `pnpm typecheck`
- `pnpm test` — vitest unit tests for `lib/cloudinary/transforms.ts`
- `pnpm seed` — seed demo garments (not implemented yet)

## Status

Setup + spike phase (Sep 17-18). The Cloudinary pipeline (upload, cutout, tagging, crops,
generative backgrounds/recolor, search) is not wired up yet — those are typed stubs pending a
Cloudinary account. See `docs/decisions.md` for what's real vs. stubbed.
