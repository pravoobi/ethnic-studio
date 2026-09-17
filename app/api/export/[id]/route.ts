import JSZip from "jszip";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { buildExportTransformation } from "@/lib/cloudinary/transforms";
import { EXPORT_PRESETS } from "@/lib/presets";

// Builds a zip of the 3 marketplace export crops (CLAUDE.md §"Export presets"). These are
// already generated/cached by the core pipeline (lib/pipeline.ts) — this route only fetches
// and zips the already-cached bytes, it never triggers new generation.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cloudinary = getCloudinaryClient();

  const zip = new JSZip();
  try {
    await Promise.all(
      EXPORT_PRESETS.map(async (preset) => {
        const url = cloudinary.url(id, { raw_transformation: buildExportTransformation(preset.id) });
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${preset.id} crop (${res.status})`);
        }
        const bytes = await res.arrayBuffer();
        zip.file(`${preset.id}.png`, bytes);
      })
    );
  } catch (err) {
    console.error(`[export/${id}] failed:`, err);
    return new Response(JSON.stringify({ error: "Could not build export zip" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const zipBytes = await zip.generateAsync({ type: "arraybuffer" });
  return new Response(zipBytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${id.split("/").pop()}.zip"`,
    },
  });
}
