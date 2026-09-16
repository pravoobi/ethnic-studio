// Pure transformation-string builders (CLAUDE.md rule: "Transformation strings are built only
// here as pure functions with unit tests. No inline transformation strings in components.").
// No Cloudinary API calls happen in this file — these functions just produce strings.

import {
  BACKGROUND_PRESETS,
  type BackgroundPresetId,
  EXPORT_PRESETS,
  type ExportPresetId,
  RECOLOR_PALETTE,
  type RecolorPaletteId,
} from "@/lib/presets";

const DELIVERY_SEGMENT = "f_auto,q_auto";

/** Every delivered URL must include this (CLAUDE.md §"Delivery"). */
export function buildDeliveryTransformation(): string {
  return DELIVERY_SEGMENT;
}

/** Smart crop to an exact size using Cloudinary's content-aware auto-gravity crop. */
export function buildSmartCropTransformation(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`buildSmartCropTransformation: width/height must be positive numbers, got ${width}x${height}`);
  }
  return `c_fill,g_auto,w_${width},h_${height}`;
}

/** Full transformation string for one of the marketplace export presets. */
export function buildExportTransformation(presetId: ExportPresetId): string {
  const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`buildExportTransformation: unknown export preset "${presetId}"`);
  }

  const segments = [buildSmartCropTransformation(preset.width, preset.height)];
  if (preset.whiteBackground) {
    segments.push("b_white");
  }
  segments.push(buildDeliveryTransformation());
  return segments.join("/");
}

/** Generative background replacement using one of the preset prompts. */
export function buildGenBackgroundReplaceTransformation(presetId: BackgroundPresetId): string {
  const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`buildGenBackgroundReplaceTransformation: unknown background preset "${presetId}"`);
  }
  return `e_gen_background_replace:prompt_${encodeURIComponent(preset.prompt)}`;
}

/** Generative recolor against one of the palette swatches. */
export function buildGenRecolorTransformation(paletteId: RecolorPaletteId, fromColor = "any"): string {
  const swatch = RECOLOR_PALETTE.find((s) => s.id === paletteId);
  if (!swatch) {
    throw new Error(`buildGenRecolorTransformation: unknown recolor palette id "${paletteId}"`);
  }
  return `e_gen_recolor:from-color_${encodeURIComponent(fromColor)};to-color_${swatch.toColor}`;
}
