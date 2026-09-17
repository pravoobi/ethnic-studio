import { describe, expect, it } from "vitest";
import {
  buildCutoutTransformation,
  buildDeliveryTransformation,
  buildExportTransformation,
  buildGenBackgroundReplaceTransformation,
  buildGenRecolorTransformation,
  buildVideoTransformation,
} from "./transforms";

describe("buildDeliveryTransformation", () => {
  it("always returns f_auto,q_auto", () => {
    expect(buildDeliveryTransformation()).toBe("f_auto,q_auto");
  });
});

describe("buildCutoutTransformation", () => {
  it("chains the background-removal effect with delivery", () => {
    expect(buildCutoutTransformation()).toBe("e_background_removal/f_auto,q_auto");
  });
});

describe("buildExportTransformation", () => {
  it("builds the Meesho preset by AI-extending the backdrop to 1:1 (no crop)", () => {
    expect(buildExportTransformation("meesho")).toBe("c_pad,w_1024,h_1024,b_gen_fill/f_auto,q_auto");
  });

  it("builds the Amazon preset as a cutout padded onto pure white", () => {
    expect(buildExportTransformation("amazon")).toBe("e_background_removal/c_pad,w_2000,h_2000,b_white/f_auto,q_auto");
  });

  it("builds the Instagram preset by AI-extending the backdrop to 4:5 (no crop)", () => {
    expect(buildExportTransformation("instagram")).toBe("c_pad,w_1080,h_1350,b_gen_fill/f_auto,q_auto");
  });

  it("never crops: no preset uses c_fill/c_crop, and b_ stays a qualifier of c_pad", () => {
    for (const id of ["meesho", "amazon", "instagram"] as const) {
      const result = buildExportTransformation(id);
      expect(result).not.toMatch(/c_(fill|crop|thumb)/);
      // `b_...` must share a component with `c_pad` (comma-joined), never stand alone after a slash.
      expect(result).not.toMatch(/\/b_/);
      expect(result).toMatch(/c_pad,[^/]*b_/);
    }
  });

  it("throws on an unknown preset id", () => {
    // @ts-expect-error deliberately invalid preset id for the error-path test
    expect(() => buildExportTransformation("unknown")).toThrow(/unknown export preset/i);
  });
});

describe("buildVideoTransformation", () => {
  it("builds a 4s zoompan padded to 1080x1350 with a blurred video background, output mp4", () => {
    expect(buildVideoTransformation()).toBe(
      "e_zoompan:mode_ztc;maxzoom_1.3;du_4/c_pad,w_1080,h_1350,b_blurred:400:15/f_mp4/q_auto"
    );
  });

  it("never mixes image-only params into the video chain (Cloudinary rejects b_gen_fill after zoompan)", () => {
    const result = buildVideoTransformation();
    expect(result).not.toContain("gen_fill");
    expect(result).not.toContain("f_auto");
    expect(result).not.toContain("e_loop");
    expect(result.indexOf("e_zoompan")).toBe(0);
  });
});

describe("buildGenBackgroundReplaceTransformation", () => {
  it("double-encodes the preset prompt and appends delivery", () => {
    const result = buildGenBackgroundReplaceTransformation("studio-white");
    const [effectSegment, deliverySegment] = result.split("/");
    expect(effectSegment).toMatch(/^e_gen_background_replace:prompt_/);
    expect(effectSegment).toContain(
      encodeURIComponent(encodeURIComponent("plain white studio backdrop, soft even lighting, no shadows"))
    );
    // A literal "," or " " in the effect segment breaks Cloudinary's parser (confirmed live).
    const [, promptValue] = effectSegment.split("prompt_");
    expect(promptValue).not.toContain(",");
    expect(promptValue).not.toContain(" ");
    // Must exactly match buildDeliveryTransformation() — eager pre-generation and the render-time
    // URL have to be byte-identical or eager doesn't actually warm what gets requested.
    expect(deliverySegment).toBe(buildDeliveryTransformation());
  });

  it("throws on an unknown preset id", () => {
    // @ts-expect-error deliberately invalid preset id for the error-path test
    expect(() => buildGenBackgroundReplaceTransformation("unknown")).toThrow(/unknown background preset/i);
  });
});

describe("buildGenRecolorTransformation", () => {
  it("builds a prompt/to-color transformation using the palette hex value, defaulting the subject to 'garment', with delivery appended", () => {
    const result = buildGenRecolorTransformation("royal-blue");
    expect(result).toBe(
      `e_gen_recolor:prompt_${encodeURIComponent(encodeURIComponent("garment"))};to-color_4169E1/${buildDeliveryTransformation()}`
    );
  });

  it("accepts a custom subject", () => {
    const result = buildGenRecolorTransformation("mustard", "saree");
    expect(result).toBe(
      `e_gen_recolor:prompt_${encodeURIComponent(encodeURIComponent("saree"))};to-color_E1AD01/${buildDeliveryTransformation()}`
    );
  });

  it("throws on an unknown palette id", () => {
    // @ts-expect-error deliberately invalid palette id for the error-path test
    expect(() => buildGenRecolorTransformation("unknown")).toThrow(/unknown recolor palette/i);
  });
});
