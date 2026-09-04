import { describe, expect, it } from "vitest";
import { ELEMENT_TYPES, isElementType } from "./elementType.js";

describe("ELEMENT_TYPES", () => {
  it("contains exactly 54 unique element types", () => {
    expect(ELEMENT_TYPES).toHaveLength(54);
    expect(new Set(ELEMENT_TYPES).size).toBe(54);
  });

  it("rejects abstractClass as an element type", () => {
    expect(isElementType("abstractClass")).toBe(false);
    expect(ELEMENT_TYPES.includes("abstractClass" as never)).toBe(false);
  });
});
