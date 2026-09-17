// Preset constants for the Cloudinary generative pipeline (CLAUDE.md §"Cloudinary pipeline").
// Kept as data here so lib/cloudinary/transforms.ts stays pure and lib/pipeline.ts stays declarative.

// Seller-selected at upload time — stands in for auto-tagging (the "Google Auto Tagging"
// add-on isn't subscribed on this account, confirmed via pnpm spike; see docs/decisions.md).
export const GARMENT_CATEGORIES = ["saree", "kurta", "lehenga"] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export type BackgroundPresetId = "studio-white" | "festive-mandap" | "lifestyle-instagram";

export interface BackgroundPreset {
  id: BackgroundPresetId;
  label: string;
  prompt: string;
}

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: "studio-white",
    label: "Studio White",
    prompt: "plain white studio backdrop, soft even lighting, no shadows",
  },
  {
    id: "festive-mandap",
    label: "Festive Mandap",
    prompt: "festive Indian wedding mandap backdrop, warm golden lighting, marigold flowers",
  },
  {
    id: "lifestyle-instagram",
    label: "Lifestyle / Instagram",
    prompt: "outdoor lifestyle setting, natural daylight, shallow depth of field",
  },
];

export type RecolorPaletteId = "maroon" | "royal-blue" | "emerald" | "mustard";

export interface RecolorSwatch {
  id: RecolorPaletteId;
  label: string;
  /** Cloudinary `to-color` value for e_gen_recolor, as a hex string without "#". */
  toColor: string;
}

export const RECOLOR_PALETTE: readonly RecolorSwatch[] = [
  { id: "maroon", label: "Maroon", toColor: "800000" },
  { id: "royal-blue", label: "Royal Blue", toColor: "4169E1" },
  { id: "emerald", label: "Emerald", toColor: "046307" },
  { id: "mustard", label: "Mustard", toColor: "E1AD01" },
];

export type ExportPresetId = "meesho" | "amazon" | "instagram";

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  whiteBackground: boolean;
}

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  { id: "meesho", label: "Meesho (1:1)", width: 1024, height: 1024, aspectRatio: "1:1", whiteBackground: false },
  { id: "amazon", label: "Amazon (white bg)", width: 2000, height: 2000, aspectRatio: "1:1", whiteBackground: true },
  { id: "instagram", label: "Instagram (4:5)", width: 1080, height: 1350, aspectRatio: "4:5", whiteBackground: false },
];
