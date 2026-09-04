import { describe, expect, it } from "vitest";
import { ACTOR, CLASS_BOX, DASH_ARRAY, USE_CASE } from "./compartments.js";

describe("compartment metrics", () => {
  it("matches section 8 class box numbers", () => {
    expect(CLASS_BOX.minWidth).toBe(180);
    expect(CLASS_BOX.minHeight).toBe(72);
    expect(CLASS_BOX.nameCompartmentHeight).toBe(32);
    expect(CLASS_BOX.rowHeight).toBe(20);
    expect(CLASS_BOX.fontFamily).toBe("Inter, system-ui, sans-serif");
    expect(CLASS_BOX.bodyFontSizePx).toBe(12);
    expect(CLASS_BOX.nameFontSizePx).toBe(13);
    expect(CLASS_BOX.nameFontWeight).toBe("bold");
    expect(CLASS_BOX.abstractNameItalic).toBe(true);
  });

  it("matches section 8 actor and use case numbers", () => {
    expect(ACTOR.width).toBe(24);
    expect(ACTOR.height).toBe(40);
    expect(USE_CASE.minWidth).toBe(140);
    expect(USE_CASE.minHeight).toBe(70);
  });

  it("uses the standard dash pattern", () => {
    expect(DASH_ARRAY).toBe("6 4");
  });
});
