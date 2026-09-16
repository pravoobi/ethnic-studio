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

## 2026-09-17 — Track decision: pending

Not yet decided. `CLAUDE.md` says decide Track 2 (Generative Content Workflows) vs. Track 3
(Media-Savvy Startup) by end of Sep 18, after hand-testing AI features on 3 real photos and
checking free-tier credit costs. Update this entry once decided, and update the track line in
`CLAUDE.md` to match.
