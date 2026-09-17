"use client";

import { useRef, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import type { CloudinaryUploadWidgetInfo, CloudinaryUploadWidgetResults } from "next-cloudinary";
import { GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/presets";
import type { PipelineResult } from "@/lib/pipeline";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export default function UploadForm() {
  const [category, setCategory] = useState<GarmentCategory>(GARMENT_CATEGORIES[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [publicId, setPublicId] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CldUploadWidget creates the underlying Cloudinary widget instance once (lazily, on script
  // load) and only ever calls the onSuccess closure captured at that first render — so reading
  // `category` state directly here would always see whatever it was at mount time, not whatever
  // the seller picked afterward. A ref sidesteps that: reading `.current` always gets the live
  // value regardless of which render's closure ends up being invoked. Confirmed live: without
  // this, every upload was silently recorded as the default category ("saree").
  const categoryRef = useRef(category);
  categoryRef.current = category;

  async function runPipelineFor(id: string) {
    setPhase("processing");
    try {
      const res = await fetch(`/api/pipeline/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryRef.current }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Pipeline request failed (${res.status})`);
      }
      const result: PipelineResult = await res.json();
      setPipelineResult(result);
      setPhase("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function handleSuccess(results: CloudinaryUploadWidgetResults) {
    const info = results.info;
    const resolved: CloudinaryUploadWidgetInfo | null = typeof info === "object" ? info : null;
    if (!resolved?.public_id) {
      setErrorMessage("Upload succeeded but no public_id was returned.");
      setPhase("error");
      return;
    }
    setPublicId(resolved.public_id);
    void runPipelineFor(resolved.public_id);
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Category
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={category}
          onChange={(e) => setCategory(e.target.value as GarmentCategory)}
          disabled={phase === "uploading" || phase === "processing"}
        >
          {GARMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <CldUploadWidget
        signatureEndpoint="/api/sign-upload"
        options={{ folder: "ethnic-studio/garments" }}
        onOpen={() => {
          setErrorMessage(null);
          setPhase("uploading");
        }}
        onSuccess={handleSuccess}
        onError={(error) => {
          setErrorMessage(typeof error === "string" ? error : JSON.stringify(error));
          setPhase("error");
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={phase === "uploading" || phase === "processing"}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {phase === "uploading" || phase === "processing" ? "Working…" : "Choose photo"}
          </button>
        )}
      </CldUploadWidget>

      {phase === "processing" && <p className="text-sm text-zinc-600 dark:text-zinc-400">Running pipeline…</p>}

      {phase === "error" && errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      {phase === "done" && pipelineResult && publicId && (
        <div className="flex flex-col gap-2 rounded border border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <p className="font-medium">Done: {publicId}</p>
          <ul className="flex flex-col gap-1">
            {pipelineResult.steps.map((step) => (
              <li key={step.step} className={step.status === "done" ? "text-green-700 dark:text-green-400" : "text-red-600"}>
                {step.step}: {step.status}
                {step.error ? ` — ${step.error}` : ""}
              </li>
            ))}
          </ul>
          <a href="/dashboard" className="underline underline-offset-2">
            View in dashboard →
          </a>
        </div>
      )}
    </div>
  );
}
