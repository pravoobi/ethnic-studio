"use client";

import { useEffect } from "react";

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[catalog] render error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Catalog</h1>
      <p className="max-w-md text-sm text-red-600">Couldn&apos;t load the catalog right now. This is usually temporary.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="w-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Try again
      </button>
    </main>
  );
}
