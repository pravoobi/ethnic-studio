"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GARMENT_CATEGORIES } from "@/lib/presets";

export default function CatalogFilters({ colors }: { colors: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const color = searchParams.get("color") ?? "";

  function updateParam(key: "category" | "color", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/catalog${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Category
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={category}
          onChange={(e) => updateParam("category", e.target.value)}
        >
          <option value="">All</option>
          {GARMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Color
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={color}
          onChange={(e) => updateParam("color", e.target.value)}
        >
          <option value="">All</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {(category || color) && (
        <button
          type="button"
          onClick={() => router.push("/catalog")}
          className="text-sm underline underline-offset-2 transition-colors hover:text-indigo-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
