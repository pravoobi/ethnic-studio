import { describe, expect, it } from "vitest";
import { nameColorFromHex } from "./colorNaming";

describe("nameColorFromHex", () => {
  it("names a dark saturated red as Maroon, not Black (regression: RGB-distance false positive)", () => {
    // Confirmed live 2026-09-18: a naive nearest-RGB-color match picked "Black" for this hex
    // because Euclidean RGB distance is dominated by lightness, not hue.
    expect(nameColorFromHex("#3F020E")).toBe("Maroon");
  });

  it("names a pale cyan-gray as Seafoam, not White (the bug this module fixes)", () => {
    // This exact hex came back "white" from Cloudinary's own predominant-color bucketing.
    expect(nameColorFromHex("#B3CFCE")).toBe("Seafoam");
  });

  it("names a pale sage green as Sage Green, not Lime", () => {
    // This exact hex came back "lime" from Cloudinary's own predominant-color bucketing.
    expect(nameColorFromHex("#B0C8B7")).toBe("Sage Green");
  });

  it("names true achromatic colors by lightness alone", () => {
    expect(nameColorFromHex("#FFFFFF")).toBe("White");
    expect(nameColorFromHex("#808080")).toBe("Gray");
    expect(nameColorFromHex("#141414")).toBe("Black");
  });

  it("names clearly saturated hues sensibly", () => {
    expect(nameColorFromHex("#0000FF")).toBe("Royal Blue");
    expect(nameColorFromHex("#FFD700")).toBe("Gold");
    // #800080 ("purple" by CSS name) is dark enough (l≈0.25) to fall in the "deep" bucket,
    // which is a defensible read for this shade — plum is a dark purple too.
    expect(nameColorFromHex("#800080")).toBe("Plum");
  });
});
