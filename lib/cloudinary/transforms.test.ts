import { describe, expect, it } from "vitest";
import {
  buildDeliveryTransformation,
  buildExportTransformation,
  buildGenBackgroundReplaceTransformation,
  buildGenRecolorTransformation,
  buildSmartCropTransformation,
} from "@/lib/cloudinary/transforms";

describe("buildDeliveryTransformation", () => {
  it("always returns f_auto,q_auto", () => {
    expect(buildDeliveryTransformation()).toBe("f_auto,q_auto");
  });
});

describe("buildSmartCropTransformation", () => {
  it("builds an auto-gravity fill crop for the given dimensions", () => {
    expect(buildSmartCropTransformation(1024, 1024)).toBe("c_fill,g_auto,w_1024,h_1024");
  });

  it.each([0, -1, NaN, Infinity])("rejects a non-positive-finite width (%p)", (bad) => {
    expect(() => buildSmartCropTransformation(bad, 100)).toThrow();
  });
});

describe("buildExportTransformation", () => {
  it("builds the Meesho preset without a white background segment", () => {
    const result = buildExportTransformation("meesho");
    expect(result).toBe("c_fill,g_auto,w_1024,h_1024/f_auto,q_auto");
  });

  it("builds the Amazon preset with a white background segment", () => {
    const result = buildExportTransformation("amazon");
    expect(result).toBe("c_fill,g_auto,w_2000,h_2000/b_white/f_auto,q_auto");
  });

  it("builds the Instagram preset at 1080x1350", () => {
    const result = buildExportTransformation("instagram");
    expect(result).toBe("c_fill,g_auto,w_1080,h_1350/f_auto,q_auto");
  });

  it("throws on an unknown preset id", () => {
    // @ts-expect-error deliberately invalid preset id for the error-path test
    expect(() => buildExportTransformation("unknown")).toThrow(/unknown export preset/i);
  });
});

describe("buildGenBackgroundReplaceTransformation", () => {
  it("encodes the preset prompt into the transformation string", () => {
    const result = buildGenBackgroundReplaceTransformation("studio-white");
    expect(result).toMatch(/^e_gen_background_replace:prompt_/);
    expect(result).toContain(encodeURIComponent("plain white studio backdrop, soft even lighting, no shadows"));
  });

  it("throws on an unknown preset id", () => {
    // @ts-expect-error deliberately invalid preset id for the error-path test
    expect(() => buildGenBackgroundReplaceTransformation("unknown")).toThrow(/unknown background preset/i);
  });
});

describe("buildGenRecolorTransformation", () => {
  it("builds a from/to color transformation using the palette hex value", () => {
    const result = buildGenRecolorTransformation("royal-blue");
    expect(result).toBe("e_gen_recolor:from-color_any;to-color_4169E1");
  });

  it("accepts a custom fromColor", () => {
    const result = buildGenRecolorTransformation("mustard", "red");
    expect(result).toBe("e_gen_recolor:from-color_red;to-color_E1AD01");
  });

  it("throws on an unknown palette id", () => {
    // @ts-expect-error deliberately invalid palette id for the error-path test
    expect(() => buildGenRecolorTransformation("unknown")).toThrow(/unknown recolor palette/i);
  });
});
