"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateVariantsButton({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/${encodeURIComponent(publicId)}/variants`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const result = await res.json();
      const failed = result.variants?.filter((v: { status: string }) => v.status !== "done") ?? [];
      if (failed.length > 0) {
        setError(`${failed.length} variant(s) failed — click again to retry.`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate backgrounds & colors"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
