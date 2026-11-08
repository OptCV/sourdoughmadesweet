import { describe, it, expect } from "vitest";
import {
  appearanceSchema,
  sectionStyleSchema,
  defaultAppearance,
  brandVariables,
  sectionVariables,
  contrast,
  readableText,
} from "../shared/appearance";
describe("owner appearance settings", () => {
  it("keeps existing sites unchanged when customization is absent", () => {
    expect(appearanceSchema.parse({})).toEqual(defaultAppearance);
    expect(
      sectionVariables(defaultAppearance, "chocolate")["--section-bg"],
    ).toBe("#452920");
  });
  it("allows arbitrary hex palettes while maintaining readable text", () => {
    for (const bg of ["#FFFFFF", "#000000", "#00FF00", "#F01A88", "#773399"]) {
      const a = appearanceSchema.parse({
        background: bg,
        primary: bg,
        accent: bg,
      });
      const vars = brandVariables(a);
      expect(contrast(bg, vars["--page-text"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bg, vars["--on-primary"])).toBeGreaterThanOrEqual(4.5);
      expect(readableText(bg, bg)).not.toBe(bg);
    }
  });
  it("updates inherited sections together but preserves intentional overrides", () => {
    const a = appearanceSchema.parse({ accent: "#123456" });
    expect(sectionVariables(a, "gold")["--section-bg"]).toBe("#123456");
    expect(
      sectionVariables(a, "gold", {
        backgroundColor: "#ABCDEF",
        backgroundImageId: null,
      })["--section-bg"],
    ).toBe("#ABCDEF");
  });
  it("rejects CSS injection, arbitrary image URLs and empty headlines", () => {
    expect(
      appearanceSchema.safeParse({ primary: "red;display:none" }).success,
    ).toBe(false);
    expect(
      sectionStyleSchema.safeParse({
        backgroundImageId: "https://example.com/image",
      }).success,
    ).toBe(false);
    expect(appearanceSchema.safeParse({ heroHeading: "   " }).success).toBe(
      false,
    );
  });
  it("permits empty optional hero copy and safely formats media IDs", () => {
    expect(
      appearanceSchema.parse({ heroEyebrow: "", heroSubheading: "" })
        .heroEyebrow,
    ).toBe("");
    expect(
      sectionVariables(defaultAppearance, "cream", {
        backgroundColor: null,
        backgroundImageId: "00000000-0000-4000-8000-000000000001",
      }).backgroundImage,
    ).toBe('url("/api/media/00000000-0000-4000-8000-000000000001")');
  });
});
