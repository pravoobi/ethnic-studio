# Seed photos

Drop 10-15 real, flat-lay garment photos here before running `pnpm seed`.

**Filename convention:** each file must start with its category, followed by `-` or `_`, e.g.:

- `saree-01.jpg`, `saree-emerald.png`
- `kurta-01.jpg`
- `lehenga-01.jpg`

Anything after the category prefix can be whatever you like. Files that don't start with a
recognized category (`saree`, `kurta`, `lehenga`) are skipped with a warning.

`pnpm seed` requires the app to be running (`pnpm dev`, or set `SEED_BASE_URL` to a deployed
URL) — it uploads each photo to Cloudinary directly, then calls the real `/api/pipeline/[id]`
route so seeded data goes through the exact same pipeline as a real upload.

These are real photos and won't be committed — this folder is gitignored except for this
README, same as `fixtures/spike-photos/`.
