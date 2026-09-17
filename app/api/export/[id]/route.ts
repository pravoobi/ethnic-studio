import JSZip from "jszip";
import { getCloudinaryClient } from "@/lib/cloudinary/client";
import { buildExportTransformation, buildVideoTransformation } from "@/lib/cloudinary/transforms";
import { prisma } from "@/lib/db";
import { EXPORT_PRESETS, VIDEO_PRESET } from "@/lib/presets";

// Builds a zip of the marketplace exports (CLAUDE.md §"Export presets"): the 3 crops, plus the
// product video if it has been generated. Everything here is already generated/cached by the
// pipeline — this route only fetches and zips existing bytes, it never triggers new generation,
// which is why the video is gated on variantsGeneratedAt.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cloudinary = getCloudinaryClient();

  const files: { name: string; transformation: string }[] = EXPORT_PRESETS.map((preset) => ({
    name: `${preset.id}.png`,
    transformation: buildExportTransformation(preset.id),
  }));

  const garment = await prisma.garment.findUnique({ where: { publicId: id }, select: { variantsGeneratedAt: true } });
  if (garment?.variantsGeneratedAt) {
    files.push({ name: `${VIDEO_PRESET.id}.mp4`, transformation: buildVideoTransformation() });
  }

  const zip = new JSZip();
  try {
    await Promise.all(
      files.map(async (file) => {
        const url = cloudinary.url(id, { raw_transformation: file.transformation });
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${file.name} (${res.status})`);
        }
        zip.file(file.name, await res.arrayBuffer());
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
