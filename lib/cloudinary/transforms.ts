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
} from "../presets";

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

/**
 * Cloudinary decodes a transformation path segment once when routing the request, then
 * decodes each effect sub-param's text value again when parsing it — so free text embedded
 * in a transformation string (e.g. a generative prompt) needs percent-encoding twice, or a
 * literal comma/space in the text gets mistaken for a transformation delimiter. Confirmed
 * against a live account 2026-09-17 (see docs/decisions.md): a single-encoded prompt with a
 * comma in it throws `Invalid transformation component` from Cloudinary's parser.
 */
function encodeTransformationText(text: string): string {
  return encodeURIComponent(encodeURIComponent(text));
}

/** Generative background replacement using one of the preset prompts. */
export function buildGenBackgroundReplaceTransformation(presetId: BackgroundPresetId): string {
  const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`buildGenBackgroundReplaceTransformation: unknown background preset "${presetId}"`);
  }
  return `e_gen_background_replace:prompt_${encodeTransformationText(preset.prompt)}`;
}

/**
 * Generative recolor against one of the palette swatches. `subject` names what in the image
 * should be recolored (Cloudinary's `e_gen_recolor` takes a `prompt`, not a `from-color` —
 * there's no "recolor anything" mode). Defaults to "garment" since every listing here is a
 * single garment photo; pass the specific category (e.g. "saree") for a more targeted match.
 */
export function buildGenRecolorTransformation(paletteId: RecolorPaletteId, subject = "garment"): string {
  const swatch = RECOLOR_PALETTE.find((s) => s.id === paletteId);
  if (!swatch) {
    throw new Error(`buildGenRecolorTransformation: unknown recolor palette id "${paletteId}"`);
  }
  return `e_gen_recolor:prompt_${encodeTransformationText(subject)};to-color_${swatch.toColor}`;
}
