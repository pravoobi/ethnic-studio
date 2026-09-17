// Pure hex -> fashion-appropriate color name mapping. Exists because Cloudinary's own
// `predominant` bucket names are too coarse for pastels: a pale cyan-gray (#B3CFCE) came back
// "white" and a pale sage (#B0C8B7) came back "lime" — confirmed live 2026-09-18 against real
// garment photos (docs/decisions.md). A naive nearest-named-color-by-RGB-distance approach has
// its own failure mode (a dark saturated red like #3F020E measures numerically closer to near-
// black than to "maroon" in raw RGB space, since Euclidean RGB distance is dominated by
// lightness), so this classifies by hue family first, then picks a lightness/saturation-
// appropriate name within that family — closer to how a person actually names a color.

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

/** Picks a fashion-relevant color name from a single hex swatch. */
export function nameColorFromHex(hex: string): string {
  const { h, s, l } = hexToHsl(hex);

  // Achromatic — name by lightness only, no hue to go on.
  if (s < 0.12) {
    if (l > 0.92) return "White";
    if (l > 0.7) return "Silver";
    if (l > 0.45) return "Gray";
    if (l > 0.2) return "Charcoal";
    return "Black";
  }

  const pale = l > 0.75;
  const deep = l < 0.3;

  if (h < 15 || h >= 345) {
    if (deep) return "Maroon";
    if (pale) return "Blush";
    return s > 0.55 ? "Red" : "Rose";
  }
  if (h < 45) {
    if (deep) return "Rust";
    if (pale) return "Peach";
    return "Orange";
  }
  if (h < 70) {
    if (deep) return "Olive";
    if (pale) return "Cream";
    return s < 0.5 ? "Mustard" : "Gold";
  }
  if (h < 90) {
    return pale ? "Pale Yellow-Green" : "Lime";
  }
  if (h < 170) {
    if (deep) return "Forest Green";
    if (pale) return "Mint";
    return s < 0.4 ? "Sage Green" : "Emerald";
  }
  if (h < 200) {
    if (deep) return "Teal";
    if (pale) return "Seafoam";
    return "Turquoise";
  }
  if (h < 230) {
    if (deep) return "Navy";
    if (pale) return "Powder Blue";
    return "Sky Blue";
  }
  if (h < 255) {
    if (deep) return "Navy";
    return "Royal Blue";
  }
  if (h < 280) {
    return pale ? "Lavender" : "Indigo";
  }
  if (h < 320) {
    if (deep) return "Plum";
    if (pale) return "Lilac";
    return "Purple";
  }
  // 320-345
  if (pale) return "Blush Pink";
  return l > 0.55 ? "Pink" : "Magenta";
}
