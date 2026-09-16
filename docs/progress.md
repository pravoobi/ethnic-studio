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
- Create Cloudinary account; note add-on activation status and free quota for auto-tagging,
  background removal, `e_gen_background_replace`, `e_gen_recolor`.
- Hand-test every AI feature on 3 real garment photos, log credit cost per feature.
- Decide track by Sep 18 EOD; record the decision here and update the track line in `CLAUDE.md`.
