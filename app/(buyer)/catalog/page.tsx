const TRYON_URL = process.env.NEXT_PUBLIC_TRYON_URL ?? "https://pravoobi.github.io/try-on";

export default function CatalogPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Catalog</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Search-API-backed filtering isn&apos;t wired up yet — buyer-side work starts Sep 26-27.
      </p>
      <a
        href={TRYON_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium underline underline-offset-2"
      >
        Try it on →
      </a>
    </main>
  );
}
